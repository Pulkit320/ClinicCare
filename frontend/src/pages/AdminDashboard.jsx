import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/authContext.jsx';
import API from '../services/api.js';
import { ShieldCheck, Calendar, User, Clock, AlertTriangle, LogOut, CheckCircle } from 'lucide-react';

const AdminDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const [doctors, setDoctors] = useState([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState('');
    const [leaveDate, setLeaveDate] = useState('');
    
    const [loading, setLoading] = useState(true);
    const [leaveLoading, setLeaveLoading] = useState(false);
    const [leaveResult, setLeaveResult] = useState(null);
    const [error, setError] = useState('');

    // Fetch doctors list on mount
    useEffect(() => {
        const fetchDoctors = async () => {
            setLoading(true);
            try {
                const res = await API.get('/doctors');
                setDoctors(res.data);
                if (res.data.length > 0) {
                    setSelectedDoctorId(res.data[0].id.toString());
                }
            } catch (err) {
                console.error('Failed to fetch doctors:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDoctors();
    }, []);

    // Handle Doctor Leave Cancellation trigger
    const handleSetDoctorLeave = async (e) => {
        e.preventDefault();
        setError('');
        setLeaveResult(null);

        if (!selectedDoctorId || !leaveDate) {
            setError('Please select a doctor and pick a leave date.');
            return;
        }

        setLeaveLoading(true);
        try {
            const res = await API.post(`/doctors/${selectedDoctorId}/leave`, {
                date: leaveDate
            });

            setLeaveResult(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to record doctor leave.');
        } finally {
            setLeaveLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            {/* Header */}
            <header className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ color: 'var(--primary-blue)', fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <ShieldCheck size={28} /> Clinic Administration Portal
                    </h1>
                    <p style={{ color: 'var(--secondary-text)', fontSize: '0.95rem' }}>Welcome back, <strong>Admin</strong>!</p>
                </div>
                <button onClick={handleLogout} className="btn-primary" style={{ background: 'transparent', color: 'var(--secondary-text)', border: '1px solid rgba(108, 114, 172, 0.3)' }}>
                    <LogOut size={18} /> Log Out
                </button>
            </header>

            {/* Metrics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-card">
                    <h4 style={{ color: 'var(--secondary-text)', fontSize: '0.9rem', marginBottom: '0.4rem' }}>Total Active Doctors</h4>
                    <h2 style={{ color: 'var(--primary-blue)', fontSize: '2rem' }}>{doctors.length} Doctors</h2>
                </div>
                <div className="glass-card">
                    <h4 style={{ color: 'var(--secondary-text)', fontSize: '0.9rem', marginBottom: '0.4rem' }}>Slot Duration Standard</h4>
                    <h2 style={{ color: 'var(--primary-blue)', fontSize: '2rem' }}>30 Minutes</h2>
                </div>
                <div className="glass-card">
                    <h4 style={{ color: 'var(--secondary-text)', fontSize: '0.9rem', marginBottom: '0.4rem' }}>AI Urgency Tracking</h4>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <span className="badge-high">HIGH</span>
                        <span className="badge-medium">MEDIUM</span>
                        <span className="badge-low">LOW</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                
                {/* Doctor List Table */}
                <div className="glass-card">
                    <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={20} /> Doctor Schedules & Working Hours
                    </h3>

                    {loading ? (
                        <p style={{ color: 'var(--secondary-text)' }}>Loading doctors...</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            {doctors.map((doc) => (
                                <div
                                    key={doc.id}
                                    style={{
                                        padding: '1rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid rgba(108, 114, 172, 0.2)',
                                        background: 'rgba(255, 255, 255, 0.6)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div>
                                        <h4 style={{ color: 'var(--text-dark)' }}>{doc.user?.name}</h4>
                                        <p style={{ color: 'var(--secondary-text)', fontSize: '0.85rem' }}>{doc.specialization}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '0.8rem', background: 'var(--accent-lavender)', color: '#fff', padding: '0.25rem 0.6rem', borderRadius: '12px', display: 'block', marginBottom: '0.2rem' }}>
                                            {doc.workingHours}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--secondary-text)' }}>30-min slots</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Doctor Leave & Conflict Cancellation Manager */}
                <div className="glass-card">
                    <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={20} /> Doctor Leave Management & Patient Alerts
                    </h3>

                    {error && (
                        <div style={{ background: 'rgba(217, 56, 56, 0.1)', color: 'var(--accent-red)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSetDoctorLeave}>
                        <div style={{ marginBottom: '1.2rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', color: 'var(--secondary-text)' }}>
                                Select Doctor Taking Leave:
                            </label>
                            <select
                                className="input-field"
                                value={selectedDoctorId}
                                onChange={(e) => setSelectedDoctorId(e.target.value)}
                            >
                                {doctors.map((doc) => (
                                    <option key={doc.id} value={doc.id}>
                                        {doc.user?.name} ({doc.specialization})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', color: 'var(--secondary-text)' }}>
                                Pick Leave Date:
                            </label>
                            <input
                                type="date"
                                className="input-field"
                                value={leaveDate}
                                onChange={(e) => setLeaveDate(e.target.value)}
                            />
                        </div>

                        <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={leaveLoading}>
                            {leaveLoading ? 'Processing Cancellations...' : 'Record Doctor Leave & Notify Patients'}
                        </button>
                    </form>

                    {/* Cancellation Results Display */}
                    {leaveResult && (
                        <div style={{ marginTop: '1.5rem', background: 'rgba(236, 99, 13, 0.1)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(236, 99, 13, 0.3)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <AlertTriangle size={20} color="var(--accent-orange)" />
                                <strong style={{ color: 'var(--accent-orange)' }}>Doctor Leave Recorded</strong>
                            </div>
                            <p style={{ color: 'var(--text-dark)', fontSize: '0.9rem' }}>{leaveResult.message}</p>
                            <span style={{ fontSize: '0.8rem', color: 'var(--secondary-text)', marginTop: '0.4rem', display: 'block' }}>
                                Affected Appointments Cancelled: {leaveResult.cancelledCount || 0}
                            </span>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default AdminDashboard;
