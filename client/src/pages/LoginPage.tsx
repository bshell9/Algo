import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.login(email, password);
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0d5e0d 0%, #1a7a1a 50%, #0d5e0d 100%)' }}>
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="inline-block px-6 py-2 rounded-lg text-white text-3xl font-bold mb-3" style={{ background: '#0d5e0d', border: '3px solid #fff' }}>
            AutoGlass Pod
          </div>
          <p className="text-white/80 text-sm">Shop Management System</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-lg shadow-2xl p-6 space-y-4" style={{ border: '2px solid #c0c0c0' }}>
          <div>
            <label className="label-ga">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-ga" placeholder="admin@autoglass.com" required />
          </div>
          <div>
            <label className="label-ga">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-ga" placeholder="Enter password" required />
          </div>
          <button type="submit" disabled={loading} className="btn-ga-action w-full justify-center py-2">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <div className="text-center pt-2 border-t" style={{ borderColor: '#ddd' }}>
            <p className="text-xs text-gray-500">Demo: admin@autoglass.com / password123</p>
          </div>
        </form>
      </div>
    </div>
  );
}
