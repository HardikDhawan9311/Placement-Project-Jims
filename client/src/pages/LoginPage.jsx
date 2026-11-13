import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import useAuthStore from '../store/useAuthStore';
import axiosInstance from '../api/axiosInstance';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !role) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      const user = await login({ email, password, role });
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      toast.error(err.message || "Invalid credentials. Please try again.");
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email first to recover your password");
      return;
    }
    try {
      await axiosInstance.post('/api/users/forgot-password', { email });
      toast.success("Password recovery instructions have been sent to your email.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Password recovery is currently unavailable.");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Illustration */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-indigo-600 to-indigo-800 p-12 flex-col justify-center items-center text-white">
        <div className="max-w-md space-y-6">
          <div className="w-full h-64 rounded-lg overflow-hidden">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1758518732175-5d608ba3abdf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMHRlYW0lMjBtZWV0aW5nfGVufDF8fHx8MTc3MjY1OTE3NHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="College Placement"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-4xl font-bold">Welcome to Placement Portal</h1>
          <p className="text-indigo-100 text-lg text-center">
            Streamline your college placement process with our comprehensive management system.
            Connect students with opportunities seamlessly.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
              <p className="text-gray-500">Access your placement dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-left block">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-left block">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-left block">Role</Label>
                <Select value={role} onValueChange={setRole} required>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="placement_officer">Placement Officer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Login'}
              </Button>

              <div className="flex items-center justify-between mt-2">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline font-medium"
                >
                  Forgot Password?
                </button>
                <div className="text-sm">
                  <span className="text-gray-500">New here? </span>
                  <Link
                    to="/signup"
                    className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium"
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
            </form>
          </div>

          <p className="text-center mt-6 text-gray-500 text-sm">
            Placement Management System
          </p>
        </div>
      </div>
    </div>
  );
}
