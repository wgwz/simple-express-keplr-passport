import {useRef, useState, useEffect} from 'react';
import './App.css';
import axios from 'axios';
import { Window as KeplrWindow } from '@keplr-wallet/types';
import { AminoMsg, makeSignDoc } from '@cosmjs/amino';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Window extends KeplrWindow {}
}

function LoginForm(props: any) {
  const usernameEl = useRef<HTMLInputElement>(null);
  const passwordEl = useRef<HTMLInputElement>(null);
  const [isLoggedIn, setLoggedIn] = useState(false);
  const [userHasKeplr, setUserHasKeplr] = useState(false);

  useEffect(() => {
     console.log('useEffect called');
     if (window.keplr) {
       setUserHasKeplr(true);
     }
  }, []); 

  const loginHandler = async () => {
    const obj = {
      username: usernameEl?.current?.value,
      password: passwordEl?.current?.value,
    };
    try {
      const login = await axios.post('http://localhost:3000/login', obj, {
        withCredentials: true,
      });
      if (login.status === 200) { setLoggedIn(true) };
    } catch (err) {
      console.log(err);
    }
  }

  const logoutHandler = async () => {
    try {
      const logout = await axios.post('http://localhost:3000/logout', null, {
        withCredentials: true,
      });
      if (logout.status === 200) { setLoggedIn(false) };
    } catch (err) {
      console.log(err);
    }
  }

  const keplrHandler = async () => {
    console.log('keplr button clicked');
    try {
      const enable = await window.keplr!.enable('regen-1');
      console.log(enable);
    } catch (err) {
      console.log(err);
    }
    const key = await window.keplr!.getKey('regen-1');
    console.log(key);
    const jsonTx: AminoMsg = {
      type: 'cosmos-sdk/TextProposal',
      value: {
        title: "Regen Network Login Text Proposal",
        description: 'This is a transaction that allows Regen Network to authenticate you with our application.',
        // proposer: address,
        // initial_deposit: [{ denom: 'stake', amount: '0' }]
      }
    };
    const fee = {
      gas: '1',
      amount: [
        { denom: 'regen', amount: '0' }
      ]
    };
    const signDoc = makeSignDoc([jsonTx], fee, 'regen-1', 'Regen Network Login Memo', '0', '0');
    console.log(signDoc);
    const defaultOptions = window.keplr!.defaultOptions;
    window.keplr!.defaultOptions = {
      sign: {
        preferNoSetFee: true,
        preferNoSetMemo: true,
        disableBalanceCheck: true,
      }
    };
    const signature = await window.keplr!.signAmino(
      "regen-1",
      key.bech32Address,
      signDoc
    );
    window.keplr!.defaultOptions = defaultOptions;
    console.log(signature);
  }

  if (isLoggedIn) {
    return <button onClick={logoutHandler}>Logout</button>
  }

  if (userHasKeplr) {
  return (
    <div>
      <div className='form'>
        <p>Login with username/password</p>
        <label htmlFor='username'>Username</label>
        <input id='username' ref={usernameEl} />
        <label htmlFor='password'>Password</label>
        <input type='password' id='password' ref={passwordEl} />
        <button onClick={loginHandler}>Login</button>
      </div>
      <div className='form'>
        <p>Login with Keplr</p>
        <button onClick={keplrHandler}>Login</button>
      </div>
    </div>
  );
  } else {
    return (
    <div>
      <div className='form'>
        <p>Login with username/password</p>
        <label htmlFor='username'>Username</label>
        <input id='username' ref={usernameEl} />
        <label htmlFor='password'>Password</label>
        <input type='password' id='password' ref={passwordEl} />
        <button onClick={loginHandler}>Login</button>
      </div>
    </div>
    );
  }
}

function App() {
  return (
    <div className='App'>
      <LoginForm/>
    </div>
  );
}

export default App;

