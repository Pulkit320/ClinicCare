import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/authContext.jsx';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!email || !password) {
            setError('Please fill all the fields');
            return;
        }

        setLoading(true);
        try {
            const user = await login(email, password);
            if (user.role === 'DOCTOR') navigate('/doctor');
            else if (user.role === 'ADMIN') navigate('/admin');
            else navigate('/patient');
        } catch (error) {
            setError(error.response?.data?.message || 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: 'center', minHeight: '85vh' }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '420px' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ color: 'var(--primary-blue)', fontSize: '1.6rem', marginBottom: '0.4rem' }}>Welcome Back</h2>
                    <p style={{ color: 'var(--secondary-text)', fontSize: '0.9rem' }}>Log into ClinicCare Platform</p>
                </div>
                {error && (
                    <div style={{ background: 'rgba(217, 56,56,0.1)', color: 'var(--accent-red)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.2rem' }}>
                        <label style={{ color: 'var(--secondary-text)', fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem', fontWeight: '600' }}>Email Address</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="Enter your email" />
                    </div>
                    <div style={{ marginBottom: '1.8rem' }}>
                        <label style={{ color: 'var(--secondary-text)', fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem', fontWeight: '600' }}>Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" placeholder="Enter your password" />
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                        {loading ? 'Signing In...' : 'Login'}
                    </button>
                </form>
                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
                    <p style={{ color: 'var(--secondary-text)', marginBottom: '0.6rem' }}>Don't have an account?</p>
                    <Link to="/register" style={{ color: 'var(--primary-blue)', fontWeight: '600', textDecoration: 'none' }}>
                        Create Account
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;