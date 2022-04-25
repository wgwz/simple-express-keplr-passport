import {useRef, useState, useEffect} from 'react';
import './App.css';
import axios from 'axios';
import { Window as KeplrWindow } from '@keplr-wallet/types';
import { makeSignDoc } from '@cosmjs/amino';

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
    //const signDoc = makeSignDoc(msgs || [jsonTx], fee, 'regen-1', 'Test Memo', '0', '0');
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

