import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/authContext.jsx';
import API from '../services/api.js';
import { Stethoscope, User, Sparkles, CheckCircle, FileText, LogOut, Clock, Activity, ShieldCheck, HelpCircle } from 'lucide-react';

const DoctorDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const [activeTab, setActiveTab] = useState('queue');
    const [appointments, setAppointments] = useState([]);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [clinicalNotes, setClinicalNotes] = useState('');
    
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [postVisitResult, setPostVisitResult] = useState(null);
    const [error, setError] = useState('');

    // Fetch Doctor's Appointments
    useEffect(() => {
        const fetchAppointments = async () => {
            setLoading(true);
            try {
                const queue = [
                    {
                        id: 3,
                        patientName: 'Alice Patient',
                        patientEmail: 'alice@example.com',
                        time: '10:00 - 10:30 AM',
                        date: '2026-08-27',
                        symptoms: 'Throbbing migraine, light sensitivity, and fatigue for 2 days.',
                        urgency: 'MEDIUM',
                        chiefComplaint: 'Two-day throbbing migraine with light sensitivity.',
                        questions: [
                            '1. How long do the migraine episodes usually last?',
                            '2. Have you noticed any visual aura or nausea before the pain starts?',
                            '3. Have over-the-counter pain relievers helped at all?'
                        ],
                        status: 'SCHEDULED'
                    },
                    {
                        id: 4,
                        patientName: 'Sarah Chen',
                        patientEmail: 'sarah@example.com',
                        time: '11:00 - 11:30 AM',
                        date: '2026-08-27',
                        symptoms: 'Severe chest tightness and shortness of breath during light exercise.',
                        urgency: 'HIGH',
                        chiefComplaint: 'Acute chest tightness and dyspnea on exertion.',
                        questions: [
                            '1. Does the tightness radiate to your arm, neck, or jaw?',
                            '2. Do you have any personal or family history of heart conditions?',
                            '3. When did this shortness of breath first start?'
                        ],
                        status: 'SCHEDULED'
                    }
                ];

                setAppointments(queue);
                if (queue.length > 0) {
                    setSelectedAppointment(queue[0]);
                }
            } catch (err) {
                console.error('Failed to load appointments:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAppointments();
    }, []);

    // Trigger Gemini Post-Visit AI Summary & Complete Visit
    const handleGeneratePostVisitSummary = async (e) => {
        e.preventDefault();
        setError('');
        setPostVisitResult(null);

        if (!selectedAppointment || !clinicalNotes.trim()) {
            setError('Please enter clinical notes and diagnosis before generating summary.');
            return;
        }

        setSummaryLoading(true);
        try {
            const res = await API.post('/llm/post-visit', {
                appointmentId: selectedAppointment.id,
                clinicalNotes
            });

            setPostVisitResult(res.data.data);

            setAppointments((prev) =>
                prev.map((app) =>
                    app.id === selectedAppointment.id ? { ...app, status: 'COMPLETED' } : app
                )
            );
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to generate AI post-visit summary.');
        } finally {
            setSummaryLoading(false);
        }
    };

    const getUrgencyBadge = (urgency) => {
        if (urgency === 'HIGH') return <span className="badge-high">URGENCY: HIGH</span>;
        if (urgency === 'LOW') return <span className="badge-low">URGENCY: LOW</span>;
        return <span className="badge-medium">URGENCY: MEDIUM</span>;
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
                            <Stethoscope size={22} color="#FFF" />
                        </div>
                        <div>
                            <h2 style={{ color: 'var(--primary-blue)', fontSize: '1.35rem', fontWeight: '700', lineHeight: '1.1' }}>ClinicCare</h2>
                            <span style={{ fontSize: '0.72rem', color: 'var(--secondary-text)', letterSpacing: '0.8px', fontWeight: '600' }}>DOCTOR PORTAL</span>
                        </div>
                    </div>

                    {/* Navigation Menu */}
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <button
                            onClick={() => setActiveTab('queue')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.8rem',
                                padding: '0.85rem 1.1rem',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                borderLeft: activeTab === 'queue' ? '4px solid var(--primary-blue)' : '4px solid transparent',
                                background: activeTab === 'queue' ? 'rgba(108, 114, 172, 0.15)' : 'transparent',
                                color: activeTab === 'queue' ? 'var(--primary-blue)' : 'var(--secondary-text)',
                                fontWeight: activeTab === 'queue' ? '700' : '500',
                                fontSize: '0.92rem',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'var(--transition-smooth)'
                            }}
                        >
                            <Clock size={19} color={activeTab === 'queue' ? 'var(--primary-blue)' : 'var(--secondary-text)'} /> Patient Queue
                        </button>

                        <button
                            onClick={() => setActiveTab('insights')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.8rem',
                                padding: '0.85rem 1.1rem',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                borderLeft: activeTab === 'insights' ? '4px solid var(--primary-blue)' : '4px solid transparent',
                                background: activeTab === 'insights' ? 'rgba(108, 114, 172, 0.15)' : 'transparent',
                                color: activeTab === 'insights' ? 'var(--primary-blue)' : 'var(--secondary-text)',
                                fontWeight: activeTab === 'insights' ? '700' : '500',
                                fontSize: '0.92rem',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'var(--transition-smooth)'
                            }}
                        >
                            <Activity size={19} color={activeTab === 'insights' ? 'var(--primary-blue)' : 'var(--secondary-text)'} /> Clinical Insights
                        </button>
                    </nav>
                </div>

                {/* Doctor User Footer */}
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
                            D
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <h4 style={{ fontSize: '0.92rem', color: 'var(--text-dark)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontWeight: '600' }}>Dr. Smith</h4>
                            <p style={{ fontSize: '0.78rem', color: 'var(--secondary-text)', margin: 0 }}>General Physician</p>
                        </div>
                    </div>

                    <button onClick={handleLogout} className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.7)', color: 'var(--secondary-text)', border: '1px solid rgba(108, 114, 172, 0.25)', padding: '0.65rem', boxShadow: 'none' }}>
                        <LogOut size={16} /> Log Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="main-content">
                
                {activeTab === 'queue' && (
                    <div className="tab-content">
                        <div style={{ marginBottom: '2.2rem' }}>
                            <h1 style={{ color: 'var(--primary-blue)', fontSize: '1.9rem', fontWeight: '700' }}>Doctor Consultation Portal</h1>
                            <p style={{ color: 'var(--secondary-text)', fontSize: '0.96rem', marginTop: '0.2rem' }}>Welcome back, <strong>Dr. Smith</strong>! Review pre-visit AI urgency briefs and complete consultations.</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem' }}>
                            
                            {/* Left Panel: Today's Patient Queue */}
                            <div className="glass-card">
                                <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.15rem' }}>
                                    <Clock size={20} /> Today's Patient Queue
                                </h3>

                                {loading ? (
                                    <p style={{ color: 'var(--secondary-text)' }}>Loading patient schedule...</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                        {appointments.map((app) => (
                                            <div
                                                key={app.id}
                                                onClick={() => { setSelectedAppointment(app); setPostVisitResult(null); }}
                                                style={{
                                                    padding: '1.1rem',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: selectedAppointment?.id === app.id ? '2px solid var(--primary-blue)' : '1px solid rgba(108, 114, 172, 0.18)',
                                                    background: selectedAppointment?.id === app.id ? 'rgba(108, 114, 172, 0.12)' : 'rgba(255, 255, 255, 0.65)',
                                                    cursor: 'pointer',
                                                    transition: 'var(--transition-smooth)'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                    <h4 style={{ color: 'var(--text-dark)', fontSize: '1rem', fontWeight: '600' }}>{app.patientName}</h4>
                                                    {getUrgencyBadge(app.urgency)}
                                                </div>
                                                <p style={{ color: 'var(--secondary-text)', fontSize: '0.86rem', marginBottom: '0.3rem' }}>Time: {app.time}</p>
                                                <span style={{ fontSize: '0.78rem', color: app.status === 'COMPLETED' ? 'var(--accent-green)' : 'var(--primary-blue)', fontWeight: '700' }}>
                                                    Status: {app.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Right Panel: Selected Patient AI Brief & Clinical Notes Generator */}
                            {selectedAppointment && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    
                                    {/* Gemini AI Pre-Visit Brief */}
                                    <div className="glass-card" style={{ borderLeft: '5px solid var(--primary-blue)', background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(236, 240, 248, 0.7) 100%)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                                            <h3 style={{ color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.15rem' }}>
                                                <Sparkles size={20} color="var(--accent-orange)" /> AI Pre-Visit Brief: {selectedAppointment.patientName}
                                            </h3>
                                            {getUrgencyBadge(selectedAppointment.urgency)}
                                        </div>

                                        <div style={{ marginBottom: '1.2rem' }}>
                                            <strong style={{ fontSize: '0.9rem', color: 'var(--secondary-text)' }}>Patient Reported Symptoms:</strong>
                                            <p style={{ color: 'var(--text-dark)', fontSize: '0.95rem', marginTop: '0.2rem', fontWeight: '500' }}>{selectedAppointment.symptoms}</p>
                                        </div>

                                        <div style={{ background: 'rgba(255, 255, 255, 0.75)', padding: '1.2rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(108, 114, 172, 0.18)' }}>
                                            <strong style={{ color: 'var(--primary-blue)', fontSize: '0.92rem' }}>Gemini AI Suggested Questions for Doctor:</strong>
                                            <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', color: 'var(--text-dark)', fontSize: '0.92rem', lineHeight: '1.6' }}>
                                                {selectedAppointment.questions?.map((q, idx) => (
                                                    <li key={idx} style={{ marginBottom: '0.3rem' }}>{q}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Clinical Notes & Post-Visit Summary Form */}
                                    <div className="glass-card">
                                        <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.15rem' }}>
                                            <FileText size={20} /> Clinical Observations & Prescription
                                        </h3>

                                        {error && (
                                            <div style={{ background: 'rgba(217, 56, 56, 0.1)', color: 'var(--accent-red)', padding: '0.85rem', borderRadius: '10px', marginBottom: '1.2rem', fontSize: '0.88rem' }}>
                                                {error}
                                            </div>
                                        )}

                                        <form onSubmit={handleGeneratePostVisitSummary}>
                                            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--secondary-text)' }}>
                                                Enter Doctor Clinical Notes, Diagnosis, and Prescriptions:
                                            </label>
                                            <textarea
                                                className="input-field"
                                                rows="5"
                                                placeholder="e.g. Diagnosed acute migraine. Prescribed Sumatriptan 50mg as needed at onset. Advised rest in a dark quiet room."
                                                value={clinicalNotes}
                                                onChange={(e) => setClinicalNotes(e.target.value)}
                                                style={{ marginBottom: '1.4rem', resize: 'vertical' }}
                                            />

                                            <button type="submit" className="btn-orange" style={{ width: '100%', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.95rem' }} disabled={summaryLoading}>
                                                <Sparkles size={18} /> {summaryLoading ? 'Generating AI Patient Summary...' : 'Generate Patient-Friendly AI Summary & Complete Visit'}
                                            </button>
                                        </form>
                                    </div>

                                    {/* Gemini AI Post-Visit Output Display */}
                                    {postVisitResult && (
                                        <div className="glass-card" style={{ border: '2px solid var(--accent-green)', background: 'linear-gradient(135deg, rgba(210, 245, 227, 0.6) 0%, rgba(255, 255, 255, 0.85) 100%)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                                                <CheckCircle size={22} color="var(--accent-green)" />
                                                <h3 style={{ color: 'var(--accent-green)', fontSize: '1.2rem' }}>Visit Completed & AI Summary Generated!</h3>
                                            </div>

                                            <div style={{ marginBottom: '1.2rem' }}>
                                                <strong style={{ fontSize: '0.9rem', color: 'var(--secondary-text)' }}>Patient-Friendly Summary:</strong>
                                                <p style={{ color: 'var(--text-dark)', fontSize: '0.95rem', marginTop: '0.3rem', lineHeight: '1.6' }}>
                                                    {postVisitResult.patientSummary}
                                                </p>
                                            </div>

                                            {postVisitResult.medicationSchedule && postVisitResult.medicationSchedule.length > 0 && (
                                                <div>
                                                    <strong style={{ fontSize: '0.9rem', color: 'var(--secondary-text)' }}>Prescribed Medication Schedule:</strong>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.6rem' }}>
                                                        {postVisitResult.medicationSchedule.map((med, idx) => (
                                                            <div key={idx} style={{ background: '#FFF', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid rgba(46, 139, 87, 0.3)' }}>
                                                                <strong style={{ color: 'var(--text-dark)' }}>Medicine: {med.name}</strong> ({med.dosage})
                                                                <p style={{ color: 'var(--secondary-text)', fontSize: '0.86rem', marginTop: '0.2rem' }}>Frequency: {med.frequency}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                </div>
                            )}

                        </div>
                    </div>
                )}

                {activeTab === 'insights' && (
                    <div className="tab-content">
                        <div style={{ marginBottom: '2.2rem' }}>
                            <h1 style={{ color: 'var(--primary-blue)', fontSize: '1.9rem', fontWeight: '700' }}>Clinical Insights</h1>
                            <p style={{ color: 'var(--secondary-text)', fontSize: '0.96rem', marginTop: '0.2rem' }}>Patient triage analytics and consultation metrics overview.</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.8rem' }}>
                            <div className="glass-card">
                                <h3 style={{ color: 'var(--primary-blue)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Today's Consultations</h3>
                                <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-dark)' }}>2 Patients</p>
                            </div>
                            <div className="glass-card">
                                <h3 style={{ color: 'var(--accent-orange)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>High Urgency Triage</h3>
                                <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-dark)' }}>1 Case</p>
                            </div>
                            <div className="glass-card">
                                <h3 style={{ color: 'var(--accent-green)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Avg Consultation Time</h3>
                                <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-dark)' }}>18 Mins</p>
                            </div>
                        </div>
                    </div>
                )}

            </main>

        </div>
    );
};

export default DoctorDashboard;
