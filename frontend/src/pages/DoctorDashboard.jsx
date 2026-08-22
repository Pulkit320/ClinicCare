import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/authContext.jsx';
import API from '../services/api.js';
import { Stethoscope, User, Sparkles, CheckCircle, FileText, LogOut, Clock } from 'lucide-react';

const DoctorDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

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
                // Mock structured patient queue with AI urgency data for doctor overview
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

            // Update status in local state
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
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            {/* Header */}
            <header className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ color: 'var(--primary-blue)', fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Stethoscope size={28} /> Doctor Consultation Portal
                    </h1>
                    <p style={{ color: 'var(--secondary-text)', fontSize: '0.95rem' }}>Welcome back, <strong>Dr. Smith</strong>!</p>
                </div>
                <button onClick={handleLogout} className="btn-primary" style={{ background: 'transparent', color: 'var(--secondary-text)', border: '1px solid rgba(108, 114, 172, 0.3)' }}>
                    <LogOut size={18} /> Log Out
                </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem' }}>
                
                {/* Left Panel: Today's Patient Queue */}
                <div className="glass-card">
                    <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                                        padding: '1rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: selectedAppointment?.id === app.id ? '2px solid var(--primary-blue)' : '1px solid rgba(108, 114, 172, 0.2)',
                                        background: selectedAppointment?.id === app.id ? 'rgba(108, 114, 172, 0.15)' : 'rgba(255, 255, 255, 0.6)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                        <h4 style={{ color: 'var(--text-dark)' }}>{app.patientName}</h4>
                                        {getUrgencyBadge(app.urgency)}
                                    </div>
                                    <p style={{ color: 'var(--secondary-text)', fontSize: '0.85rem' }}>Time: {app.time}</p>
                                    <span style={{ fontSize: '0.75rem', color: app.status === 'COMPLETED' ? 'var(--accent-green)' : 'var(--accent-orange)', fontWeight: '600' }}>
                                        Status: {app.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Panel: Selected Patient AI Brief & Clinical Notes Generator */}
                {selectedAppointment && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
                        
                        {/* Gemini AI Pre-Visit Brief */}
                        <div className="glass-card" style={{ borderLeft: '4px solid var(--primary-blue)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Sparkles size={20} color="var(--accent-orange)" /> AI Pre-Visit Brief: {selectedAppointment.patientName}
                                </h3>
                                {getUrgencyBadge(selectedAppointment.urgency)}
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <strong>Patient Reported Symptoms:</strong>
                                <p style={{ color: 'var(--secondary-text)', fontSize: '0.9rem', marginTop: '0.2rem' }}>{selectedAppointment.symptoms}</p>
                            </div>

                            <div style={{ background: 'rgba(255, 255, 255, 0.6)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(108, 114, 172, 0.2)' }}>
                                <strong style={{ color: 'var(--primary-blue)' }}>Gemini AI Suggested Questions to Ask Patient:</strong>
                                <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', color: 'var(--secondary-text)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                    {selectedAppointment.questions?.map((q, idx) => (
                                        <li key={idx}>{q}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Clinical Notes & Post-Visit Summary Form */}
                        <div className="glass-card">
                            <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileText size={20} /> Clinical Observations & Prescription
                            </h3>

                            {error && (
                                <div style={{ background: 'rgba(217, 56, 56, 0.1)', color: 'var(--accent-red)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleGeneratePostVisitSummary}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', color: 'var(--secondary-text)' }}>
                                    Enter Doctor Clinical Notes, Diagnosis, and Prescriptions:
                                </label>
                                <textarea
                                    className="input-field"
                                    rows="5"
                                    placeholder="e.g. Diagnosed acute migraine. Prescribed Sumatriptan 50mg as needed at onset. Advised rest in a dark quiet room."
                                    value={clinicalNotes}
                                    onChange={(e) => setClinicalNotes(e.target.value)}
                                    style={{ marginBottom: '1.2rem', resize: 'vertical' }}
                                />

                                <button type="submit" className="btn-orange" style={{ width: '100%', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }} disabled={summaryLoading}>
                                    <Sparkles size={18} /> {summaryLoading ? 'Generating AI Patient Summary...' : 'Generate Patient-Friendly AI Summary & Complete Visit'}
                                </button>
                            </form>
                        </div>

                        {/* Gemini AI Post-Visit Output Display */}
                        {postVisitResult && (
                            <div className="glass-card" style={{ border: '2px solid var(--accent-green)', background: 'rgba(244, 246, 251, 0.9)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <CheckCircle size={22} color="var(--accent-green)" />
                                    <h3 style={{ color: 'var(--accent-green)' }}>Visit Completed & AI Summary Generated!</h3>
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <strong>Patient-Friendly Summary:</strong>
                                    <p style={{ color: 'var(--secondary-text)', fontSize: '0.95rem', marginTop: '0.3rem', lineHeight: '1.6' }}>
                                        {postVisitResult.patientSummary}
                                    </p>
                                </div>

                                {postVisitResult.medicationSchedule && postVisitResult.medicationSchedule.length > 0 && (
                                    <div>
                                        <strong>Prescribed Medication Schedule:</strong>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            {postVisitResult.medicationSchedule.map((med, idx) => (
                                                <div key={idx} style={{ background: '#FFF', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(46, 139, 87, 0.3)' }}>
                                                    <strong>Medicine: {med.name}</strong> ({med.dosage})
                                                    <p style={{ color: 'var(--secondary-text)', fontSize: '0.85rem' }}>Frequency: {med.frequency}</p>
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
    );
};

export default DoctorDashboard;
