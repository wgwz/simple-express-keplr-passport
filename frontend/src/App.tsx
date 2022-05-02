import {useRef, useState, useEffect} from 'react';
import './App.css';
import axios, {AxiosError} from 'axios';
import { Window as KeplrWindow } from '@keplr-wallet/types';
import { AminoMsg, makeSignDoc } from '@cosmjs/amino';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Window extends KeplrWindow {}
}

function LoginForm(props: any) {
  const usernameEl = useRef<HTMLInputElement>(null);
  const passwordEl = useRef<HTMLInputElement>(null);
  const [userHasKeplr, setUserHasKeplr] = useState(false);
  const [isLoggedIn, setLoggedIn] = useState(JSON.parse(sessionStorage.getItem('loggedIn') as string));
  const [currentUser, setCurrentUser] = useState(JSON.parse(sessionStorage.getItem('currentUser') as string));

  useEffect(() => {
     console.log('useEffect called');
     if (window.keplr) {
       setUserHasKeplr(true);
     }
     const fetchAsync = async () => {
       try {
         // this is an example of how to make an authenticated request
         // to the backend. withCredentials instructs axios to use the
         // http-only cookie associated to this domain.
         const resp = await axios.get('http://localhost:3000/profile', {
           withCredentials: true,
         });
         console.log(resp);
       } catch (err) {
         if (err instanceof AxiosError) {
           console.log(err.message);
         } else {
           console.log(err);
         }
       }
     }
     fetchAsync();
  }, [isLoggedIn]); 

  const loginHandler = async () => {
    const obj = {
      username: usernameEl?.current?.value,
      password: passwordEl?.current?.value,
    };
    try {
      const login = await axios.post('http://localhost:3000/login', obj, {
        withCredentials: true,
      });
      if (login.status === 200) {
        setCurrentUser(login.data.user);
        setLoggedIn(true);
        sessionStorage.setItem("currentUser", JSON.stringify(login.data.user));
        sessionStorage.setItem("loggedIn", JSON.stringify(true));
      };
    } catch (err) {
      console.log(err);
    }
  }

  const logoutHandler = async () => {
    try {
      // todo: eventually an endpoint like this would need to
      // return some identifying information about the user, so
      // that the front-end knows who's authenticated. specifically,
      // this is true in the scenario where a user is going through an
      // email-based login (or this case username/password).
      const logout = await axios.post('http://localhost:3000/logout', null, {
        withCredentials: true,
      });
      if (logout.status === 200) {
        setCurrentUser({});
        setLoggedIn(false);
        sessionStorage.removeItem("currentUser");
        sessionStorage.removeItem("loggedIn");
      };
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
    const aminoMsg: AminoMsg = {
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
    const signDoc = makeSignDoc([aminoMsg], fee, 'regen-1', 'Regen Network Login Memo', '0', '0');
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
    const obj = { key, signature };
    try {
      const login = await axios.post('http://localhost:3000/keplr-login', obj, {
        withCredentials: true,
      });
      if (login.status === 200) {
        setCurrentUser(login.data.user);
        setLoggedIn(true);
        sessionStorage.setItem("currentUser", JSON.stringify(login.data.user));
        sessionStorage.setItem("loggedIn", JSON.stringify(true));
      };
    } catch (err) {
      console.log(err);
    }
  }

  if (isLoggedIn && currentUser) {
    return (
      <div>
        <div>{currentUser!.username}</div>
        <div>{currentUser!.address}</div>
        <button onClick={logoutHandler}>Logout</button>
      </div>
    )
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

