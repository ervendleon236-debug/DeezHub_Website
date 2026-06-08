import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) alert(error.message);
    else if (isSignUp) alert('Check your email for the confirmation link!');
    setLoading(false);
  };

  return (
    <div className="auth-container" style={{ padding: '20px', maxWidth: '400px', margin: 'auto', textAlign: 'center' }}>
      <h2>{isSignUp ? 'Create Account' : 'Sign In'}</h2>
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button 
          type="submit" 
          disabled={loading}
          style={{ padding: '10px', backgroundColor: '#e50914', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
        </button>
      </form>
      <p style={{ marginTop: '15px' }}>
        {isSignUp ? 'Already have an account?' : 'New to DeezHub?'}
        <button 
          onClick={() => setIsSignUp(!isSignUp)} 
          style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', marginLeft: '5px' }}
        >
          {isSignUp ? 'Sign In' : 'Join Now'}
        </button>
      </p>
    </div>
  );
}
