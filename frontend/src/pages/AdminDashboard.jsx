import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/authContext.jsx';
import API from '../services/api.js';
import { ShieldCheck, Calendar, User, Clock, AlertTriangle, LogOut, CheckCircle, Activity, Settings } from 'lucide-react';

const AdminDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const [activeTab, setActiveTab] = useState('overview');
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
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>

            {/* Left Sidebar Navigation */}
            <aside className="sidebar">
                <div>
                    {/* Brand Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem', paddingLeft: '0.5rem' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, var(--primary-blue) 0%, var(--primary-blue-hover) 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 8px 16px -4px rgba(108, 114, 172, 0.4)'
                        }}>
                            <ShieldCheck size={22} color="#FFF" />
                        </div>
                        <div>
                            <h2 style={{ color: 'var(--primary-blue)', fontSize: '1.35rem', fontWeight: '700', lineHeight: '1.1' }}>ClinicCare</h2>
                            <span style={{ fontSize: '0.72rem', color: 'var(--secondary-text)', letterSpacing: '0.8px', fontWeight: '600' }}>ADMIN PORTAL</span>
                        </div>
                    </div>

                    {/* Navigation Menu */}
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <button
                            onClick={() => setActiveTab('overview')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.8rem',
                                padding: '0.85rem 1.1rem',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                borderLeft: activeTab === 'overview' ? '4px solid var(--primary-blue)' : '4px solid transparent',
                                background: activeTab === 'overview' ? 'rgba(108, 114, 172, 0.15)' : 'transparent',
                                color: activeTab === 'overview' ? 'var(--primary-blue)' : 'var(--secondary-text)',
                                fontWeight: activeTab === 'overview' ? '700' : '500',
                                fontSize: '0.92rem',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'var(--transition-smooth)'
                            }}
                        >
                            <Activity size={19} color={activeTab === 'overview' ? 'var(--primary-blue)' : 'var(--secondary-text)'} /> Clinic Overview
                        </button>

                        <button
                            onClick={() => setActiveTab('leave')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.8rem',
                                padding: '0.85rem 1.1rem',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                borderLeft: activeTab === 'leave' ? '4px solid var(--primary-blue)' : '4px solid transparent',
                                background: activeTab === 'leave' ? 'rgba(108, 114, 172, 0.15)' : 'transparent',
                                color: activeTab === 'leave' ? 'var(--primary-blue)' : 'var(--secondary-text)',
                                fontWeight: activeTab === 'leave' ? '700' : '500',
                                fontSize: '0.92rem',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'var(--transition-smooth)'
                            }}
                        >
                            <Calendar size={19} color={activeTab === 'leave' ? 'var(--primary-blue)' : 'var(--secondary-text)'} /> Doctor Leave Manager
                        </button>
                    </nav>
                </div>

                {/* Admin User Footer */}
                <div style={{ borderTop: '1px solid rgba(108, 114, 172, 0.15)', paddingTop: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.2rem', paddingLeft: '0.2rem' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary-blue) 0%, var(--accent-lavender) 100%)',
                            color: '#FFF',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontWeight: '700',
                            fontSize: '1rem',
                            boxShadow: '0 4px 10px rgba(108, 114, 172, 0.3)'
                        }}>
                            A
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <h4 style={{ fontSize: '0.92rem', color: 'var(--text-dark)', margin: 0, fontWeight: '600' }}>Administrator</h4>
                            <p style={{ fontSize: '0.78rem', color: 'var(--secondary-text)', margin: 0 }}>System Ops</p>
                        </div>
                    </div>

                    <button onClick={handleLogout} className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.7)', color: 'var(--secondary-text)', border: '1px solid rgba(108, 114, 172, 0.25)', padding: '0.65rem', boxShadow: 'none' }}>
                        <LogOut size={16} /> Log Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="main-content">
                
                {activeTab === 'overview' && (
                    <div className="tab-content">
                        <div style={{ marginBottom: '2.2rem' }}>
                            <h1 style={{ color: 'var(--primary-blue)', fontSize: '1.9rem', fontWeight: '700' }}>Clinic Administration Portal</h1>
                            <p style={{ color: 'var(--secondary-text)', fontSize: '0.96rem', marginTop: '0.2rem' }}>Welcome back, <strong>Admin</strong>! System metrics, doctor schedules, and leave conflict automation.</p>
                        </div>

                        {/* Metrics Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.8rem', marginBottom: '2.2rem' }}>
                            <div className="glass-card">
                                <h4 style={{ color: 'var(--secondary-text)', fontSize: '0.88rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Active Doctors</h4>
                                <h2 style={{ color: 'var(--primary-blue)', fontSize: '2.2rem', fontWeight: '700' }}>{doctors.length} Doctors</h2>
                            </div>
                            <div className="glass-card">
                                <h4 style={{ color: 'var(--secondary-text)', fontSize: '0.88rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Slot Duration Standard</h4>
                                <h2 style={{ color: 'var(--primary-blue)', fontSize: '2.2rem', fontWeight: '700' }}>30 Minutes</h2>
                            </div>
                            <div className="glass-card">
                                <h4 style={{ color: 'var(--secondary-text)', fontSize: '0.88rem', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Urgency Triage</h4>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <span className="badge-high">HIGH</span>
                                    <span className="badge-medium">MEDIUM</span>
                                    <span className="badge-low">LOW</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            
                            {/* Doctor List Table */}
                            <div className="glass-card">
                                <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.15rem' }}>
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
                                                    padding: '1.1rem',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: '1px solid rgba(108, 114, 172, 0.18)',
                                                    background: 'rgba(255, 255, 255, 0.65)',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <div>
                                                    <h4 style={{ color: 'var(--text-dark)', fontSize: '1rem', fontWeight: '600' }}>{doc.user?.name}</h4>
                                                    <p style={{ color: 'var(--secondary-text)', fontSize: '0.86rem', marginTop: '0.15rem' }}>{doc.specialization}</p>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <span style={{ fontSize: '0.78rem', background: 'var(--primary-blue)', color: '#FFF', padding: '0.3rem 0.7rem', borderRadius: '12px', display: 'block', marginBottom: '0.2rem', fontWeight: '600' }}>
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
                                <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.15rem' }}>
                                    <Calendar size={20} /> Doctor Leave Management & Patient Alerts
                                </h3>

                                {error && (
                                    <div style={{ background: 'rgba(217, 56, 56, 0.1)', color: 'var(--accent-red)', padding: '0.85rem', borderRadius: '10px', marginBottom: '1.2rem', fontSize: '0.88rem' }}>
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSetDoctorLeave}>
                                    <div style={{ marginBottom: '1.2rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--secondary-text)' }}>
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
                                        <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--secondary-text)' }}>
                                            Pick Leave Date:
                                        </label>
                                        <input
                                            type="date"
                                            className="input-field"
                                            value={leaveDate}
                                            onChange={(e) => setLeaveDate(e.target.value)}
                                        />
                                    </div>

                                    <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.95rem' }} disabled={leaveLoading}>
                                        {leaveLoading ? 'Processing Cancellations...' : 'Record Doctor Leave & Notify Patients'}
                                    </button>
                                </form>

                                {/* Cancellation Results Display */}
                                {leaveResult && (
                                    <div style={{ marginTop: '1.5rem', background: 'linear-gradient(135deg, rgba(236, 99, 13, 0.12) 0%, rgba(255, 255, 255, 0.8) 100%)', padding: '1.2rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--accent-orange)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                                            <AlertTriangle size={20} color="var(--accent-orange)" />
                                            <strong style={{ color: 'var(--accent-orange)', fontSize: '1rem' }}>Doctor Leave Recorded</strong>
                                        </div>
                                        <p style={{ color: 'var(--text-dark)', fontSize: '0.92rem', lineHeight: '1.5' }}>{leaveResult.message}</p>
                                        <span style={{ fontSize: '0.82rem', color: 'var(--secondary-text)', marginTop: '0.5rem', display: 'block', fontWeight: '600' }}>
                                            Affected Appointments Cancelled: {leaveResult.cancelledCount || 0}
                                        </span>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                )}

                {activeTab === 'leave' && (
                    <div className="tab-content">
                        <div style={{ marginBottom: '2.2rem' }}>
                            <h1 style={{ color: 'var(--primary-blue)', fontSize: '1.9rem', fontWeight: '700' }}>Doctor Leave Schedule</h1>
                            <p style={{ color: 'var(--secondary-text)', fontSize: '0.96rem', marginTop: '0.2rem' }}>Automated leave conflict management and patient alert tracking.</p>
                        </div>
                    </div>
                )}

            </main>

        </div>
    );
};

export default AdminDashboard;
