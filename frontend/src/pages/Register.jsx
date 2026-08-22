import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/authContext.jsx';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('PATIENT');
    const [specialization, setSpecialization] = useState('General Physician');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { register } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!name || !email || !password) {
            setError('Please fill in all required fields.');
            return;
        }

        setLoading(true);
        try {
            const user = await register({ name, email, password, role, specialization });
            if (user.role === 'DOCTOR') navigate('/doctor');
            else navigate('/patient');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '85vh' }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '460px' }}>
                <h2 style={{ color: 'var(--primary-blue)', fontSize: '1.6rem', textAlign: 'center', marginBottom: '0.4rem' }}>Create Account</h2>
                <p style={{ color: 'var(--secondary-text)', fontSize: '0.9rem', textAlign: 'center', marginBottom: '1.5rem' }}>Join ClinicCare AI Platform</p>

                {error && (
                    <div style={{ background: 'rgba(217, 56, 56, 0.1)', color: 'var(--accent-red)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem' }}>Full Name</label>
                        <input type="text" className="input-field" placeholder="Alice Patient" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem' }}>Email Address</label>
                        <input type="email" className="input-field" placeholder="alice@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem' }}>Password</label>
                        <input type="password" className="input-field" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem' }}>Account Role</label>
                        <select className="input-field" value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="PATIENT">Patient</option>
                            <option value="DOCTOR">Doctor</option>
                        </select>
                    </div>

                    {role === 'DOCTOR' && (
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem' }}>Specialization</label>
                            <input type="text" className="input-field" placeholder="Cardiology, Neurology, etc." value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
                        </div>
                    )}

                    <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }} disabled={loading}>
                        {loading ? 'Creating Account...' : 'Register'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--secondary-text)' }}>
                    Already have an account? <Link to="/login" style={{ color: 'var(--primary-blue)', fontWeight: '600', textDecoration: 'none' }}>Log In</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
