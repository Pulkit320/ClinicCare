import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/authContext.jsx';
import API from '../services/api.js';
import { Calendar, Clock, User, Sparkles, CheckCircle, AlertCircle, LogOut, Download, FileText, History, Activity, ShieldCheck, HelpCircle, ArrowRight } from 'lucide-react';

const PatientDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Sidebar Tab State: 'book' | 'history' | 'services'
    const [activeTab, setActiveTab] = useState('book');

    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [slots, setSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [symptoms, setSymptoms] = useState('');

    const [loadingSlots, setLoadingSlots] = useState(false);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(null);
    const [aiSummary, setAiSummary] = useState(null);
    const [lastAppointment, setLastAppointment] = useState(null);
    const [myAppointments, setMyAppointments] = useState([]);
    const [loadingAppointments, setLoadingAppointments] = useState(false);
    const [error, setError] = useState('');

    // Fetch available doctors & patient appointment history
    const fetchMyAppointments = async () => {
        setLoadingAppointments(true);
        try {
            const res = await API.get('/slots/my-appointments');
            setMyAppointments(res.data || []);
        } catch (err) {
            console.error('Failed to fetch patient appointments:', err);
        } finally {
            setLoadingAppointments(false);
        }
    };

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const res = await API.get('/doctors');
                setDoctors(res.data);
                if (res.data.length > 0) {
                    setSelectedDoctor(res.data[0]);
                }
            } catch (err) {
                console.error('Failed to fetch doctors:', err);
            }
        };
        fetchDoctors();
        fetchMyAppointments();
    }, []);

    // Fetch time slots when doctor or date changes
    useEffect(() => {
        if (!selectedDoctor || !date) return;

        const fetchSlots = async () => {
            setLoadingSlots(true);
            setSelectedSlot(null);
            try {
                const res = await API.get(`/slots/available?doctorId=${selectedDoctor.id}&date=${date}`);
                if (res.data.doctorOnLeave) {
                    setSlots([]);
                    setError('Doctor is on leave on this date.');
                } else {
                    setSlots(res.data.slots || []);
                    setError('');
                }
            } catch (err) {
                console.error('Failed to fetch slots:', err);
            } finally {
                setLoadingSlots(false);
            }
        };
        fetchSlots();
    }, [selectedDoctor, date]);

    // Handle Slot Booking & Trigger Gemini AI Pre-Visit Summary
    const handleBookAppointment = async (e) => {
        e.preventDefault();
        setError('');
        setBookingSuccess(null);
        setAiSummary(null);

        if (!selectedDoctor || !selectedSlot || !symptoms.trim()) {
            setError('Please select a doctor, a time slot, and enter your symptoms.');
            return;
        }

        setBookingLoading(true);
        try {
            const bookRes = await API.post('/slots/book', {
                doctorId: selectedDoctor.id,
                date,
                startTime: selectedSlot.startTime,
                endTime: selectedSlot.endTime,
                symptoms
            });

            const appointmentId = bookRes.data.appointment.id;
            setLastAppointment({
                id: appointmentId,
                doctorName: selectedDoctor.user?.name,
                date,
                startTime: selectedSlot.startTime,
                symptoms
            });
            setBookingSuccess(bookRes.data.message);

            // Trigger Gemini Pre-Visit AI Urgency Brief
            const aiRes = await API.post('/llm/pre-visit', { appointmentId });
            setAiSummary(aiRes.data.data);

            // Refresh appointment history
            fetchMyAppointments();

        } catch (err) {
            setError(err.response?.data?.message || 'Failed to book appointment.');
        } finally {
            setBookingLoading(false);
        }
    };

    // Export Pre-Visit PDF Summary
    const exportPreVisitPDF = (summary, apptDetails) => {
        const printWindow = window.open('', '_blank');
        const content = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>ClinicCare - Pre-Visit AI Summary</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #05060B; background: #fff; line-height: 1.6; }
                    .header { border-bottom: 2px solid #6C72AC; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
                    .title { font-size: 24px; color: #6C72AC; font-weight: bold; }
                    .badge { padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
                    .badge-high { background: #FFD8D8; color: #D93838; }
                    .badge-medium { background: #FFE6D0; color: #EC630D; }
                    .badge-low { background: #D2F5E3; color: #2E8B57; }
                    .section { margin-bottom: 20px; padding: 15px; background: #F8F9FE; border-radius: 8px; border-left: 4px solid #6C72AC; }
                    .section-title { font-weight: bold; margin-bottom: 8px; color: #4D506E; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; }
                    ul { margin: 5px 0; padding-left: 20px; }
                    li { margin-bottom: 5px; color: #333; }
                    .footer { margin-top: 40px; border-top: 1px solid #E2E8F0; padding-top: 15px; font-size: 11px; color: #718096; text-align: center; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="title">ClinicCare AI Pre-Visit Health Brief</div>
                        <div style="font-size: 12px; color: #718096; margin-top: 4px;">Patient Medical Record</div>
                    </div>
                    <div class="badge badge-${(summary?.urgency || 'medium').toLowerCase()}">Urgency: ${summary?.urgency || 'MEDIUM'}</div>
                </div>

                <div class="section">
                    <div class="section-title">Patient & Appointment Details</div>
                    <p><strong>Patient Name:</strong> ${user?.name || 'Patient'}</p>
                    <p><strong>Attending Doctor:</strong> ${apptDetails?.doctorName || apptDetails?.doctor?.user?.name || 'Doctor'}</p>
                    <p><strong>Date & Time:</strong> ${apptDetails?.date || apptDetails?.slot?.date || 'N/A'} at ${apptDetails?.startTime || apptDetails?.slot?.startTime || 'N/A'}</p>
                </div>

                <div class="section">
                    <div class="section-title">Reported Symptoms & Chief Complaint</div>
                    <p>${summary?.chiefComplaint || apptDetails?.symptoms || 'N/A'}</p>
                </div>

                ${summary?.questions && summary.questions.length > 0 ? `
                <div class="section">
                    <div class="section-title">Suggested Consultation Questions</div>
                    <ul>
                        ${summary.questions.map(q => `<li>${q}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}

                <div class="footer">
                    Generated by ClinicCare AI Health System on ${new Date().toLocaleDateString()}.
                </div>
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `;
        printWindow.document.write(content);
        printWindow.document.close();
    };

    // Export Doctor Post-Visit Summary PDF
    const exportPostVisitPDF = (postSummaryText, apptDetails) => {
        const printWindow = window.open('', '_blank');
        const content = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>ClinicCare - Doctor Post-Visit Patient Summary</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #05060B; background: #fff; line-height: 1.6; }
                    .header { border-bottom: 2px solid #2E8B57; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
                    .title { font-size: 24px; color: #2E8B57; font-weight: bold; }
                    .badge { padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; background: #D2F5E3; color: #2E8B57; }
                    .section { margin-bottom: 20px; padding: 18px; background: #F4FBF7; border-radius: 8px; border-left: 4px solid #2E8B57; }
                    .section-title { font-weight: bold; margin-bottom: 8px; color: #2E8B57; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; }
                    .footer { margin-top: 40px; border-top: 1px solid #E2E8F0; padding-top: 15px; font-size: 11px; color: #718096; text-align: center; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="title">ClinicCare Medical Consultation Summary</div>
                        <div style="font-size: 12px; color: #718096; margin-top: 4px;">Doctor's Patient-Friendly Care Plan & Post-Visit Instructions</div>
                    </div>
                    <div class="badge">Visit Completed</div>
                </div>

                <div class="section">
                    <div class="section-title">Patient & Doctor Information</div>
                    <p><strong>Patient Name:</strong> ${user?.name || 'Patient'}</p>
                    <p><strong>Attending Doctor:</strong> ${apptDetails?.doctor?.user?.name || 'Doctor'}</p>
                    <p><strong>Consultation Date:</strong> ${apptDetails?.slot?.date || 'N/A'} at ${apptDetails?.slot?.startTime || 'N/A'}</p>
                    <p><strong>Chief Complaint:</strong> ${apptDetails?.symptoms || 'N/A'}</p>
                </div>

                <div class="section">
                    <div class="section-title">Doctor's AI Care Instructions & Patient Summary</div>
                    <p>${postSummaryText}</p>
                </div>

                <div class="footer">
                    Official Record generated by ClinicCare Platform on ${new Date().toLocaleDateString()}.
                </div>
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `;
        printWindow.document.write(content);
        printWindow.document.close();
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
                            <Activity size={22} color="#FFF" />
                        </div>
                        <div>
                            <h2 style={{ color: 'var(--primary-blue)', fontSize: '1.35rem', fontWeight: '700', lineHeight: '1.1' }}>ClinicCare</h2>
                            <span style={{ fontSize: '0.72rem', color: 'var(--secondary-text)', letterSpacing: '0.8px', fontWeight: '600' }}>PATIENT PORTAL</span>
                        </div>
                    </div>

                    {/* Navigation Menu */}
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <button
                            onClick={() => setActiveTab('book')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.8rem',
                                padding: '0.85rem 1.1rem',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                borderLeft: activeTab === 'book' ? '4px solid var(--primary-blue)' : '4px solid transparent',
                                background: activeTab === 'book' ? 'rgba(108, 114, 172, 0.15)' : 'transparent',
                                color: activeTab === 'book' ? 'var(--primary-blue)' : 'var(--secondary-text)',
                                fontWeight: activeTab === 'book' ? '700' : '500',
                                fontSize: '0.92rem',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'var(--transition-smooth)',
                                boxShadow: activeTab === 'book' ? '0 4px 14px rgba(108, 114, 172, 0.08)' : 'none'
                            }}
                        >
                            <Calendar size={19} color={activeTab === 'book' ? 'var(--primary-blue)' : 'var(--secondary-text)'} /> Book Appointment
                        </button>

                        <button
                            onClick={() => setActiveTab('history')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.8rem',
                                padding: '0.85rem 1.1rem',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                borderLeft: activeTab === 'history' ? '4px solid var(--primary-blue)' : '4px solid transparent',
                                background: activeTab === 'history' ? 'rgba(108, 114, 172, 0.15)' : 'transparent',
                                color: activeTab === 'history' ? 'var(--primary-blue)' : 'var(--secondary-text)',
                                fontWeight: activeTab === 'history' ? '700' : '500',
                                fontSize: '0.92rem',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'var(--transition-smooth)',
                                boxShadow: activeTab === 'history' ? '0 4px 14px rgba(108, 114, 172, 0.08)' : 'none'
                            }}
                        >
                            <History size={19} color={activeTab === 'history' ? 'var(--primary-blue)' : 'var(--secondary-text)'} /> My Appointments
                            {myAppointments.length > 0 && (
                                <span style={{ marginLeft: 'auto', background: activeTab === 'history' ? 'var(--primary-blue)' : 'rgba(108, 114, 172, 0.2)', color: activeTab === 'history' ? '#FFF' : 'var(--primary-blue)', padding: '0.15rem 0.55rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '700' }}>
                                    {myAppointments.length}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('services')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.8rem',
                                padding: '0.85rem 1.1rem',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                borderLeft: activeTab === 'services' ? '4px solid var(--primary-blue)' : '4px solid transparent',
                                background: activeTab === 'services' ? 'rgba(108, 114, 172, 0.15)' : 'transparent',
                                color: activeTab === 'services' ? 'var(--primary-blue)' : 'var(--secondary-text)',
                                fontWeight: activeTab === 'services' ? '700' : '500',
                                fontSize: '0.92rem',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'var(--transition-smooth)',
                                boxShadow: activeTab === 'services' ? '0 4px 14px rgba(108, 114, 172, 0.08)' : 'none'
                            }}
                        >
                            <ShieldCheck size={19} color={activeTab === 'services' ? 'var(--primary-blue)' : 'var(--secondary-text)'} /> Clinic Services & AI Care
                        </button>
                    </nav>
                </div>

                {/* Patient User Profile & Logout Footer */}
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
                            {user?.name?.charAt(0) || 'P'}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <h4 style={{ fontSize: '0.92rem', color: 'var(--text-dark)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontWeight: '600' }}>{user?.name}</h4>
                            <p style={{ fontSize: '0.78rem', color: 'var(--secondary-text)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{user?.email}</p>
                        </div>
                    </div>

                    <button onClick={handleLogout} className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.7)', color: 'var(--secondary-text)', border: '1px solid rgba(108, 114, 172, 0.25)', padding: '0.65rem', boxShadow: 'none' }}>
                        <LogOut size={16} /> Log Out
                    </button>
                </div>
            </aside>

            {/* Main Content Viewport */}
            <main className="main-content">

                {/* TAB 1: BOOK APPOINTMENT */}
                {activeTab === 'book' && (
                    <div className="tab-content">
                        <div style={{ marginBottom: '2.2rem' }}>
                            <h1 style={{ color: 'var(--primary-blue)', fontSize: '1.9rem', fontWeight: '700' }}>Book Consultation</h1>
                            <p style={{ color: 'var(--secondary-text)', fontSize: '0.96rem', marginTop: '0.2rem' }}>Select a specialist, choose a 30-minute time slot, and generate an AI pre-visit brief.</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                            {/* Left Column: Doctor Picker & Slots */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {/* Doctor Selector */}
                                <div className="glass-card">
                                    <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.15rem' }}>
                                        <User size={20} /> 1. Select Doctor
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                        {doctors.map((doc) => (
                                            <div
                                                key={doc.id}
                                                onClick={() => setSelectedDoctor(doc)}
                                                style={{
                                                    padding: '1.1rem',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: selectedDoctor?.id === doc.id ? '2px solid var(--primary-blue)' : '1px solid rgba(108, 114, 172, 0.18)',
                                                    background: selectedDoctor?.id === doc.id ? 'rgba(108, 114, 172, 0.12)' : 'rgba(255, 255, 255, 0.65)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    transition: 'var(--transition-smooth)'
                                                }}
                                            >
                                                <div>
                                                    <h4 style={{ color: 'var(--text-dark)', fontSize: '1rem', fontWeight: '600' }}>{doc.user?.name}</h4>
                                                    <p style={{ color: 'var(--secondary-text)', fontSize: '0.86rem', marginTop: '0.15rem' }}>{doc.specialization}</p>
                                                </div>
                                                <span style={{ fontSize: '0.78rem', background: 'var(--primary-blue)', color: '#FFF', padding: '0.3rem 0.7rem', borderRadius: '12px', fontWeight: '600' }}>
                                                    {doc.workingHours}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Slot Picker */}
                                <div className="glass-card">
                                    <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.15rem' }}>
                                        <Calendar size={20} /> 2. Pick Date & Time Slot
                                    </h3>

                                    <input
                                        type="date"
                                        className="input-field"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        style={{ marginBottom: '1.4rem' }}
                                    />

                                    {loadingSlots ? (
                                        <p style={{ color: 'var(--secondary-text)' }}>Loading time slots...</p>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                                            {slots.map((s, idx) => (
                                                <button
                                                    key={idx}
                                                    disabled={!s.isAvailable}
                                                    onClick={() => setSelectedSlot(s)}
                                                    style={{
                                                        padding: '0.75rem 0.5rem',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: selectedSlot?.startTime === s.startTime ? '2px solid var(--primary-blue)' : '1px solid rgba(108, 114, 172, 0.18)',
                                                        background: !s.isAvailable ? '#E2E8F0' : selectedSlot?.startTime === s.startTime ? 'var(--primary-blue)' : 'rgba(255, 255, 255, 0.85)',
                                                        color: !s.isAvailable ? '#94A3B8' : selectedSlot?.startTime === s.startTime ? '#FFF' : 'var(--text-dark)',
                                                        cursor: !s.isAvailable ? 'not-allowed' : 'pointer',
                                                        fontWeight: '600',
                                                        fontSize: '0.86rem',
                                                        transition: 'var(--transition-smooth)'
                                                    }}
                                                >
                                                    {s.startTime}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Symptoms & Pre-Visit AI Card */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                <div className="glass-card">
                                    <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.15rem' }}>
                                        <Sparkles size={20} color="var(--accent-orange)" /> 3. Symptoms & Booking
                                    </h3>

                                    {error && (
                                        <div style={{ background: 'rgba(217, 56, 56, 0.1)', color: 'var(--accent-red)', padding: '0.85rem', borderRadius: '10px', marginBottom: '1.2rem', fontSize: '0.88rem', border: '1px solid rgba(217, 56, 56, 0.2)' }}>
                                            {error}
                                        </div>
                                    )}

                                    {bookingSuccess && (
                                        <div style={{ background: 'rgba(46, 139, 87, 0.1)', color: 'var(--accent-green)', padding: '0.85rem', borderRadius: '10px', marginBottom: '1.2rem', fontSize: '0.88rem', border: '1px solid rgba(46, 139, 87, 0.2)' }}>
                                            <CheckCircle size={16} inline /> {bookingSuccess}
                                        </div>
                                    )}

                                    <form onSubmit={handleBookAppointment}>
                                        <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--secondary-text)' }}>
                                            Describe your symptoms for the doctor:
                                        </label>
                                        <textarea
                                            className="input-field"
                                            rows="4"
                                            placeholder="e.g. Throbbing migraine and fever for 2 days, light sensitivity..."
                                            value={symptoms}
                                            onChange={(e) => setSymptoms(e.target.value)}
                                            style={{ marginBottom: '1.4rem', resize: 'vertical' }}
                                        />

                                        <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.95rem' }} disabled={bookingLoading}>
                                            {bookingLoading ? 'Processing AI & Booking...' : 'Confirm Appointment'}
                                        </button>
                                    </form>
                                </div>

                                {/* Gemini Pre-Visit Brief Output */}
                                {aiSummary && (
                                    <div className="glass-card" style={{ border: '2px solid var(--accent-lavender)', background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(236, 240, 248, 0.7) 100%)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                                            <h3 style={{ color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.15rem' }}>
                                                <Sparkles size={20} color="var(--accent-orange)" /> AI Pre-Visit Brief
                                            </h3>
                                            {getUrgencyBadge(aiSummary.urgency)}
                                        </div>

                                        <div style={{ marginBottom: '1.2rem' }}>
                                            <strong style={{ fontSize: '0.9rem', color: 'var(--secondary-text)' }}>Chief Complaint:</strong>
                                            <p style={{ color: 'var(--text-dark)', fontSize: '0.95rem', marginTop: '0.2rem', fontWeight: '500' }}>{aiSummary.chiefComplaint}</p>
                                        </div>

                                        <div style={{ marginBottom: '1.4rem' }}>
                                            <strong style={{ fontSize: '0.9rem', color: 'var(--secondary-text)' }}>Suggested Questions for your Doctor:</strong>
                                            <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', color: 'var(--text-dark)', fontSize: '0.92rem', lineHeight: '1.6' }}>
                                                {aiSummary.questions?.map((q, idx) => (
                                                    <li key={idx} style={{ marginBottom: '0.3rem' }}>{q}</li>
                                                ))}
                                            </ul>
                                        </div>

                                        <button
                                            onClick={() => exportPreVisitPDF(aiSummary, lastAppointment)}
                                            className="btn-orange"
                                            style={{ width: '100%', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.9rem' }}
                                        >
                                            <Download size={18} /> Download AI Brief PDF
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: MY APPOINTMENTS & HISTORY */}
                {activeTab === 'history' && (
                    <div className="tab-content">
                        <div style={{ marginBottom: '2.2rem' }}>
                            <h1 style={{ color: 'var(--primary-blue)', fontSize: '1.9rem', fontWeight: '700' }}>My Appointments & Medical History</h1>
                            <p style={{ color: 'var(--secondary-text)', fontSize: '0.96rem', marginTop: '0.2rem' }}>View past and upcoming consultations, doctor post-visit care plans, and download PDF summaries.</p>
                        </div>

                        {loadingAppointments ? (
                            <p style={{ color: 'var(--secondary-text)' }}>Loading your appointments history...</p>
                        ) : myAppointments.length === 0 ? (
                            <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
                                <Calendar size={52} color="var(--primary-blue)" style={{ opacity: 0.4, marginBottom: '1.2rem' }} />
                                <h3 style={{ fontSize: '1.3rem', color: 'var(--text-dark)' }}>No Appointments Found</h3>
                                <p style={{ color: 'var(--secondary-text)', marginTop: '0.4rem', marginBottom: '1.8rem', fontSize: '0.95rem' }}>You haven't booked any appointments yet.</p>
                                <button onClick={() => setActiveTab('book')} className="btn-primary" style={{ padding: '0.85rem 1.8rem' }}>
                                    Book First Appointment
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.6rem' }}>
                                {myAppointments.map((appt) => {
                                    const preVisitSummary = appt.llmSummaries?.find(s => s.type === 'PRE_VISIT');
                                    const postVisitSummary = appt.llmSummaries?.find(s => s.type === 'POST_VISIT');
                                    let parsedPreVisit = {};
                                    try { parsedPreVisit = JSON.parse(preVisitSummary?.content || '{}'); } catch(e) { parsedPreVisit = { chiefComplaint: appt.symptoms }; }

                                    return (
                                        <div key={appt.id} className="glass-card" style={{ borderLeft: '6px solid var(--primary-blue)' }}>
                                            
                                            {/* Appointment Header Info */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <h3 style={{ color: 'var(--text-dark)', fontSize: '1.25rem', fontWeight: '700' }}>
                                                            {appt.doctor?.user?.name || 'Doctor'}
                                                        </h3>
                                                        <span style={{ fontSize: '0.8rem', background: 'rgba(108, 114, 172, 0.15)', color: 'var(--primary-blue)', padding: '0.25rem 0.75rem', borderRadius: '12px', fontWeight: '600' }}>
                                                            {appt.doctor?.specialization}
                                                        </span>
                                                    </div>
                                                    <p style={{ color: 'var(--secondary-text)', fontSize: '0.92rem', marginTop: '0.4rem' }}>
                                                        📅 <strong>Date:</strong> {appt.slot?.date} &nbsp;|&nbsp; 🕒 <strong>Time:</strong> {appt.slot?.startTime} - {appt.slot?.endTime}
                                                    </p>
                                                </div>

                                                <span style={{
                                                    fontSize: '0.82rem',
                                                    padding: '0.4rem 0.95rem',
                                                    borderRadius: '20px',
                                                    fontWeight: '700',
                                                    letterSpacing: '0.5px',
                                                    background: appt.status === 'COMPLETED' ? 'rgba(46, 139, 87, 0.15)' : appt.status === 'CONFIRMED' || appt.status === 'CONFIRM' ? 'rgba(108, 114, 172, 0.15)' : 'rgba(217, 56, 56, 0.15)',
                                                    color: appt.status === 'COMPLETED' ? 'var(--accent-green)' : appt.status === 'CONFIRMED' || appt.status === 'CONFIRM' ? 'var(--primary-blue)' : 'var(--accent-red)'
                                                }}>
                                                    STATUS: {appt.status}
                                                </span>
                                            </div>

                                            {/* Symptoms */}
                                            <div style={{ marginBottom: '1.2rem', padding: '1rem 1.2rem', background: 'rgba(255, 255, 255, 0.65)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(108, 114, 172, 0.12)' }}>
                                                <strong style={{ fontSize: '0.85rem', color: 'var(--secondary-text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reported Symptoms:</strong>
                                                <p style={{ color: 'var(--text-dark)', fontSize: '0.95rem', marginTop: '0.3rem', lineHeight: '1.5' }}>{appt.symptoms}</p>
                                            </div>

                                            {/* DOCTOR POST-VISIT SUMMARY CARD (Visible when doctor completes visit!) */}
                                            {postVisitSummary && (
                                                <div style={{ marginBottom: '1.4rem', padding: '1.4rem', background: 'linear-gradient(135deg, rgba(210, 245, 227, 0.6) 0%, rgba(255, 255, 255, 0.8) 100%)', border: '1.5px solid var(--accent-green)', borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(46, 139, 87, 0.08)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                                                        <CheckCircle size={22} color="var(--accent-green)" />
                                                        <h4 style={{ color: 'var(--accent-green)', margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>Doctor's Post-Visit Care Summary</h4>
                                                    </div>
                                                    <p style={{ color: 'var(--text-dark)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1rem' }}>
                                                        {postVisitSummary.content}
                                                    </p>
                                                    <button
                                                        onClick={() => exportPostVisitPDF(postVisitSummary.content, appt)}
                                                        className="btn-primary"
                                                        style={{ background: 'var(--accent-green)', fontSize: '0.88rem', gap: '0.5rem', padding: '0.75rem 1.3rem' }}
                                                    >
                                                        <Download size={17} /> Export Post-Visit Care PDF
                                                    </button>
                                                </div>
                                            )}

                                            {/* Pre-Visit AI Summary Export shortcut */}
                                            {preVisitSummary && (
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.8rem' }}>
                                                    <button
                                                        onClick={() => exportPreVisitPDF(parsedPreVisit, appt)}
                                                        className="btn-primary"
                                                        style={{ fontSize: '0.86rem', padding: '0.6rem 1.2rem', gap: '0.5rem' }}
                                                    >
                                                        <FileText size={17} /> Export Pre-Visit Brief PDF
                                                    </button>
                                                </div>
                                            )}

                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: CLINIC SERVICES & AI CARE (Redesigned Service Cards & Accordion FAQ) */}
                {activeTab === 'services' && (
                    <div className="tab-content">
                        <div style={{ marginBottom: '2.5rem' }}>
                            <h1 style={{ color: 'var(--primary-blue)', fontSize: '2rem', fontWeight: '700' }}>Clinic Services & AI Healthcare</h1>
                            <p style={{ color: 'var(--secondary-text)', fontSize: '0.98rem', marginTop: '0.3rem' }}>Explore ClinicCare capabilities, automated pre-triage features, and patient care guidelines.</p>
                        </div>

                        {/* Three Primary Service Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.8rem', marginBottom: '3rem' }}>
                            
                            {/* Card 1: AI Pre-Triage */}
                            <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(236, 99, 13, 0.05) 100%)', borderTop: '4px solid var(--accent-orange)' }}>
                                <div className="icon-box-ai" style={{ marginBottom: '1.2rem' }}>
                                    <Sparkles size={24} color="var(--accent-orange)" />
                                </div>
                                <h3 style={{ color: 'var(--text-dark)', fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.5rem' }}>Gemini AI Pre-Triage</h3>
                                <p style={{ color: 'var(--secondary-text)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                    Automated symptom evaluation and urgency classification before your consultation begins.
                                </p>
                            </div>

                            {/* Card 2: Google Calendar Sync */}
                            <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(108, 114, 172, 0.05) 100%)', borderTop: '4px solid var(--primary-blue)' }}>
                                <div className="icon-box-calendar" style={{ marginBottom: '1.2rem' }}>
                                    <Calendar size={24} color="var(--primary-blue)" />
                                </div>
                                <h3 style={{ color: 'var(--text-dark)', fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.5rem' }}>Google Calendar Sync</h3>
                                <p style={{ color: 'var(--secondary-text)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                    Automatic calendar invitation dispatch to sync appointments directly to your personal Google Calendar.
                                </p>
                            </div>

                            {/* Card 3: Digital Medical Reports */}
                            <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(46, 139, 87, 0.05) 100%)', borderTop: '4px solid var(--accent-green)' }}>
                                <div className="icon-box-reports" style={{ marginBottom: '1.2rem' }}>
                                    <FileText size={24} color="var(--accent-green)" />
                                </div>
                                <h3 style={{ color: 'var(--text-dark)', fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.5rem' }}>Digital Medical Reports</h3>
                                <p style={{ color: 'var(--secondary-text)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                    1-Click PDF exports for pre-visit AI briefs and official doctor consultation summaries.
                                </p>
                            </div>

                        </div>

                        {/* Refined Glass FAQ Panel */}
                        <div className="glass-card">
                            <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.25rem' }}>
                                <HelpCircle size={22} /> Frequently Asked Questions
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.6rem' }}>
                                <div>
                                    <strong style={{ fontSize: '1.02rem', color: 'var(--text-dark)', fontWeight: '600' }}>
                                        How do I view my doctor's post-visit instructions and care plan?
                                    </strong>
                                    <p style={{ color: 'var(--secondary-text)', fontSize: '0.92rem', marginTop: '0.4rem', lineHeight: '1.6' }}>
                                        Click on <strong>"My Appointments & History"</strong> in the left sidebar. Once your doctor completes your consultation, a green <strong>Doctor's Post-Visit Care Summary</strong> card will appear with your personalized care plan and a <strong>1-Click Export PDF</strong> button.
                                    </p>
                                </div>

                                <div style={{ borderTop: '1px solid rgba(108, 114, 172, 0.12)', paddingTop: '1.4rem' }}>
                                    <strong style={{ fontSize: '1.02rem', color: 'var(--text-dark)', fontWeight: '600' }}>
                                        Will my appointment automatically sync to my Google Calendar?
                                    </strong>
                                    <p style={{ color: 'var(--secondary-text)', fontSize: '0.92rem', marginTop: '0.4rem', lineHeight: '1.6' }}>
                                        Yes! As soon as you confirm your time slot, ClinicCare dispatches an automated calendar invite to your registered email address so you never miss a consultation.
                                    </p>
                                </div>

                                <div style={{ borderTop: '1px solid rgba(108, 114, 172, 0.12)', paddingTop: '1.4rem' }}>
                                    <strong style={{ fontSize: '1.02rem', color: 'var(--text-dark)', fontWeight: '600' }}>
                                        What if a doctor goes on leave on my selected date?
                                    </strong>
                                    <p style={{ color: 'var(--secondary-text)', fontSize: '0.92rem', marginTop: '0.4rem', lineHeight: '1.6' }}>
                                        If a doctor schedules leave, affected appointments are automatically flagged for cancellation and notification, and alternate open time slots will be suggested.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

            </main>

        </div>
    );
};

export default PatientDashboard;
