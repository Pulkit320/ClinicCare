import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/authContext.jsx';
import API from '../services/api.js';
import { Calendar, Clock, User, Sparkles, CheckCircle, AlertCircle, LogOut, Download, FileText, History, Activity, ShieldCheck, HelpCircle } from 'lucide-react';

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
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-gradient)' }}>

            {/* Left Sidebar Navigation */}
            <aside style={{
                width: '270px',
                background: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(24px)',
                borderRight: '1px solid rgba(108, 114, 172, 0.2)',
                padding: '2rem 1.2rem',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                position: 'sticky',
                top: 0,
                height: '100vh'
            }}>
                <div>
                    {/* Brand Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2.5rem', paddingLeft: '0.5rem' }}>
                        <Activity size={28} color="var(--primary-blue)" />
                        <div>
                            <h2 style={{ color: 'var(--primary-blue)', fontSize: '1.3rem', fontWeight: '700', lineHeight: '1.1' }}>ClinicCare</h2>
                            <span style={{ fontSize: '0.75rem', color: 'var(--secondary-text)', letterSpacing: '0.5px' }}>PATIENT PORTAL</span>
                        </div>
                    </div>

                    {/* Navigation Menu */}
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button
                            onClick={() => setActiveTab('book')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.8rem',
                                padding: '0.85rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                background: activeTab === 'book' ? 'var(--primary-blue)' : 'transparent',
                                color: activeTab === 'book' ? '#FFF' : 'var(--secondary-text)',
                                fontWeight: '600',
                                fontSize: '0.92rem',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Calendar size={18} /> Book Appointment
                        </button>

                        <button
                            onClick={() => setActiveTab('history')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.8rem',
                                padding: '0.85rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                background: activeTab === 'history' ? 'var(--primary-blue)' : 'transparent',
                                color: activeTab === 'history' ? '#FFF' : 'var(--secondary-text)',
                                fontWeight: '600',
                                fontSize: '0.92rem',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <History size={18} /> My Appointments & History
                            {myAppointments.length > 0 && (
                                <span style={{ marginLeft: 'auto', background: activeTab === 'history' ? 'rgba(255, 255, 255, 0.25)' : 'var(--accent-lavender)', color: '#FFF', padding: '0.15rem 0.5rem', borderRadius: '10px', fontSize: '0.75rem' }}>
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
                                padding: '0.85rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                background: activeTab === 'services' ? 'var(--primary-blue)' : 'transparent',
                                color: activeTab === 'services' ? '#FFF' : 'var(--secondary-text)',
                                fontWeight: '600',
                                fontSize: '0.92rem',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <ShieldCheck size={18} /> Clinic Services & AI Care
                        </button>
                    </nav>
                </div>

                {/* Patient User Footer & Logout */}
                <div style={{ borderTop: '1px solid rgba(108, 114, 172, 0.15)', paddingTop: '1.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1rem', paddingLeft: '0.3rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-blue)', color: '#FFF', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '700', fontSize: '0.95rem' }}>
                            {user?.name?.charAt(0) || 'P'}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-dark)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{user?.name}</h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--secondary-text)', margin: 0 }}>{user?.email}</p>
                        </div>
                    </div>

                    <button onClick={handleLogout} className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'transparent', color: 'var(--secondary-text)', border: '1px solid rgba(108, 114, 172, 0.3)', padding: '0.6rem' }}>
                        <LogOut size={16} /> Log Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main style={{ flex: 1, padding: '2.5rem 3rem', overflowY: 'auto' }}>

                {/* TAB 1: BOOK APPOINTMENT */}
                {activeTab === 'book' && (
                    <div>
                        <div style={{ marginBottom: '2rem' }}>
                            <h1 style={{ color: 'var(--primary-blue)', fontSize: '1.8rem' }}>Book Consultation</h1>
                            <p style={{ color: 'var(--secondary-text)', fontSize: '0.95rem' }}>Schedule a 30-minute slot with our specialists and generate an AI pre-visit brief.</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                            {/* Left Column: Doctor Picker & Slots */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {/* Doctor Selector */}
                                <div className="glass-card">
                                    <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <User size={20} /> 1. Select Doctor
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {doctors.map((doc) => (
                                            <div
                                                key={doc.id}
                                                onClick={() => setSelectedDoctor(doc)}
                                                style={{
                                                    padding: '1rem',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: selectedDoctor?.id === doc.id ? '2px solid var(--primary-blue)' : '1px solid rgba(108, 114, 172, 0.2)',
                                                    background: selectedDoctor?.id === doc.id ? 'rgba(108, 114, 172, 0.15)' : 'rgba(255, 255, 255, 0.6)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <div>
                                                    <h4 style={{ color: 'var(--text-dark)' }}>{doc.user?.name}</h4>
                                                    <p style={{ color: 'var(--secondary-text)', fontSize: '0.85rem' }}>{doc.specialization}</p>
                                                </div>
                                                <span style={{ fontSize: '0.8rem', background: 'var(--accent-lavender)', color: '#fff', padding: '0.25rem 0.6rem', borderRadius: '12px' }}>
                                                    {doc.workingHours}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Slot Picker */}
                                <div className="glass-card">
                                    <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Calendar size={20} /> 2. Pick Date & Time Slot
                                    </h3>

                                    <input
                                        type="date"
                                        className="input-field"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        style={{ marginBottom: '1.2rem' }}
                                    />

                                    {loadingSlots ? (
                                        <p style={{ color: 'var(--secondary-text)' }}>Loading time slots...</p>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                                            {slots.map((s, idx) => (
                                                <button
                                                    key={idx}
                                                    disabled={!s.isAvailable}
                                                    onClick={() => setSelectedSlot(s)}
                                                    style={{
                                                        padding: '0.65rem',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: selectedSlot?.startTime === s.startTime ? '2px solid var(--primary-blue)' : '1px solid rgba(108, 114, 172, 0.2)',
                                                        background: !s.isAvailable ? '#E2E8F0' : selectedSlot?.startTime === s.startTime ? 'var(--primary-blue)' : 'rgba(255, 255, 255, 0.9)',
                                                        color: !s.isAvailable ? '#94A3B8' : selectedSlot?.startTime === s.startTime ? '#FFF' : 'var(--text-dark)',
                                                        cursor: !s.isAvailable ? 'not-allowed' : 'pointer',
                                                        fontWeight: '600',
                                                        fontSize: '0.85rem'
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
                                    <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Sparkles size={20} color="var(--accent-orange)" /> 3. Symptoms & Booking
                                    </h3>

                                    {error && (
                                        <div style={{ background: 'rgba(217, 56, 56, 0.1)', color: 'var(--accent-red)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                                            {error}
                                        </div>
                                    )}

                                    {bookingSuccess && (
                                        <div style={{ background: 'rgba(46, 139, 87, 0.1)', color: 'var(--accent-green)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                                            <CheckCircle size={16} inline /> {bookingSuccess}
                                        </div>
                                    )}

                                    <form onSubmit={handleBookAppointment}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', color: 'var(--secondary-text)' }}>
                                            Describe your symptoms for the doctor:
                                        </label>
                                        <textarea
                                            className="input-field"
                                            rows="4"
                                            placeholder="e.g. Throbbing migraine and fever for 2 days, light sensitivity..."
                                            value={symptoms}
                                            onChange={(e) => setSymptoms(e.target.value)}
                                            style={{ marginBottom: '1.2rem', resize: 'vertical' }}
                                        />

                                        <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={bookingLoading}>
                                            {bookingLoading ? 'Processing AI & Booking...' : 'Confirm Appointment'}
                                        </button>
                                    </form>
                                </div>

                                {/* Gemini Pre-Visit Brief Output */}
                                {aiSummary && (
                                    <div className="glass-card" style={{ border: '2px solid var(--accent-lavender)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <h3 style={{ color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Sparkles size={20} color="var(--accent-orange)" /> AI Pre-Visit Brief
                                            </h3>
                                            {getUrgencyBadge(aiSummary.urgency)}
                                        </div>

                                        <div style={{ marginBottom: '1rem' }}>
                                            <strong>Chief Complaint:</strong>
                                            <p style={{ color: 'var(--secondary-text)', fontSize: '0.9rem', marginTop: '0.2rem' }}>{aiSummary.chiefComplaint}</p>
                                        </div>

                                        <div style={{ marginBottom: '1.2rem' }}>
                                            <strong>Suggested Questions for your Doctor:</strong>
                                            <ul style={{ paddingLeft: '1.2rem', marginTop: '0.4rem', color: 'var(--secondary-text)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                                {aiSummary.questions?.map((q, idx) => (
                                                    <li key={idx}>{q}</li>
                                                ))}
                                            </ul>
                                        </div>

                                        <button
                                            onClick={() => exportPreVisitPDF(aiSummary, lastAppointment)}
                                            className="btn-orange"
                                            style={{ width: '100%', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
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
                    <div>
                        <div style={{ marginBottom: '2rem' }}>
                            <h1 style={{ color: 'var(--primary-blue)', fontSize: '1.8rem' }}>My Appointments & Medical History</h1>
                            <p style={{ color: 'var(--secondary-text)', fontSize: '0.95rem' }}>View past and upcoming consultations, doctor care plans, and download PDF summaries.</p>
                        </div>

                        {loadingAppointments ? (
                            <p style={{ color: 'var(--secondary-text)' }}>Loading your appointments history...</p>
                        ) : myAppointments.length === 0 ? (
                            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                                <Calendar size={48} color="var(--primary-blue)" style={{ opacity: 0.5, marginBottom: '1rem' }} />
                                <h3>No Appointments Found</h3>
                                <p style={{ color: 'var(--secondary-text)', marginTop: '0.4rem', marginBottom: '1.5rem' }}>You haven't booked any appointments yet.</p>
                                <button onClick={() => setActiveTab('book')} className="btn-primary">
                                    Book First Appointment
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {myAppointments.map((appt) => {
                                    const preVisitSummary = appt.llmSummaries?.find(s => s.type === 'PRE_VISIT');
                                    const postVisitSummary = appt.llmSummaries?.find(s => s.type === 'POST_VISIT');
                                    let parsedPreVisit = {};
                                    try { parsedPreVisit = JSON.parse(preVisitSummary?.content || '{}'); } catch(e) { parsedPreVisit = { chiefComplaint: appt.symptoms }; }

                                    return (
                                        <div key={appt.id} className="glass-card" style={{ borderLeft: '5px solid var(--primary-blue)' }}>
                                            
                                            {/* Appointment Header Info */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                        <h3 style={{ color: 'var(--text-dark)', fontSize: '1.2rem' }}>
                                                            {appt.doctor?.user?.name || 'Doctor'}
                                                        </h3>
                                                        <span style={{ fontSize: '0.8rem', background: 'var(--accent-lavender)', color: '#FFF', padding: '0.2rem 0.7rem', borderRadius: '12px' }}>
                                                            {appt.doctor?.specialization}
                                                        </span>
                                                    </div>
                                                    <p style={{ color: 'var(--secondary-text)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
                                                        📅 <strong>Date:</strong> {appt.slot?.date} &nbsp;|&nbsp; 🕒 <strong>Time:</strong> {appt.slot?.startTime} - {appt.slot?.endTime}
                                                    </p>
                                                </div>

                                                <span style={{
                                                    fontSize: '0.82rem',
                                                    padding: '0.35rem 0.85rem',
                                                    borderRadius: '20px',
                                                    fontWeight: '700',
                                                    background: appt.status === 'COMPLETED' ? 'rgba(46, 139, 87, 0.15)' : appt.status === 'CONFIRMED' || appt.status === 'CONFIRM' ? 'rgba(108, 114, 172, 0.15)' : 'rgba(217, 56, 56, 0.15)',
                                                    color: appt.status === 'COMPLETED' ? 'var(--accent-green)' : appt.status === 'CONFIRMED' || appt.status === 'CONFIRM' ? 'var(--primary-blue)' : 'var(--accent-red)'
                                                }}>
                                                    STATUS: {appt.status}
                                                </span>
                                            </div>

                                            {/* Symptoms */}
                                            <div style={{ marginBottom: '1.2rem', padding: '0.8rem 1rem', background: 'rgba(255, 255, 255, 0.6)', borderRadius: '8px' }}>
                                                <strong style={{ fontSize: '0.85rem', color: 'var(--secondary-text)' }}>Reported Symptoms:</strong>
                                                <p style={{ color: 'var(--text-dark)', fontSize: '0.92rem', marginTop: '0.2rem' }}>{appt.symptoms}</p>
                                            </div>

                                            {/* DOCTOR POST-VISIT SUMMARY CARD (Visible when doctor completes visit!) */}
                                            {postVisitSummary && (
                                                <div style={{ marginBottom: '1.2rem', padding: '1.2rem', background: 'rgba(210, 245, 227, 0.5)', border: '1.5 solid var(--accent-green)', borderRadius: 'var(--radius-md)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                                                        <CheckCircle size={20} color="var(--accent-green)" />
                                                        <h4 style={{ color: 'var(--accent-green)', margin: 0 }}>Doctor's Post-Visit Care Summary</h4>
                                                    </div>
                                                    <p style={{ color: 'var(--text-dark)', fontSize: '0.93rem', lineHeight: '1.5' }}>
                                                        {postVisitSummary.content}
                                                    </p>
                                                    <button
                                                        onClick={() => exportPostVisitPDF(postVisitSummary.content, appt)}
                                                        className="btn-primary"
                                                        style={{ background: 'var(--accent-green)', marginTop: '0.8rem', fontSize: '0.85rem', gap: '0.4rem' }}
                                                    >
                                                        <Download size={16} /> Export Post-Visit Care PDF
                                                    </button>
                                                </div>
                                            )}

                                            {/* Pre-Visit AI Summary Export shortcut */}
                                            {preVisitSummary && (
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1rem' }}>
                                                    <button
                                                        onClick={() => exportPreVisitPDF(parsedPreVisit, appt)}
                                                        className="btn-primary"
                                                        style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', gap: '0.4rem' }}
                                                    >
                                                        <FileText size={16} /> Export Pre-Visit Brief PDF
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

                {/* TAB 3: CLINIC SERVICES & AI CARE */}
                {activeTab === 'services' && (
                    <div>
                        <div style={{ marginBottom: '2rem' }}>
                            <h1 style={{ color: 'var(--primary-blue)', fontSize: '1.8rem' }}>Clinic Services & AI Healthcare</h1>
                            <p style={{ color: 'var(--secondary-text)', fontSize: '0.95rem' }}>Explore ClinicCare services, AI triage capabilities, and patient care guidelines.</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                            <div className="glass-card">
                                <Sparkles size={28} color="var(--accent-orange)" style={{ marginBottom: '0.8rem' }} />
                                <h3>Gemini AI Pre-Triage</h3>
                                <p style={{ color: 'var(--secondary-text)', fontSize: '0.88rem', marginTop: '0.5rem' }}>
                                    Automated symptom evaluation and urgency classification before you step into the doctor's office.
                                </p>
                            </div>

                            <div className="glass-card">
                                <Calendar size={28} color="var(--primary-blue)" style={{ marginBottom: '0.8rem' }} />
                                <h3>Google Calendar Sync</h3>
                                <p style={{ color: 'var(--secondary-text)', fontSize: '0.88rem', marginTop: '0.5rem' }}>
                                    Automatic Google Calendar invitation dispatch to sync appointments directly to your personal calendar.
                                </p>
                            </div>

                            <div className="glass-card">
                                <FileText size={28} color="var(--accent-green)" style={{ marginBottom: '0.8rem' }} />
                                <h3>Digital Medical Reports</h3>
                                <p style={{ color: 'var(--secondary-text)', fontSize: '0.88rem', marginTop: '0.5rem' }}>
                                    1-Click PDF exports for all pre-visit AI briefs and doctor consultation summaries.
                                </p>
                            </div>
                        </div>

                        <div className="glass-card" style={{ marginTop: '2rem' }}>
                            <h3 style={{ color: 'var(--primary-blue)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <HelpCircle size={20} /> Frequently Asked Questions
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                                <div>
                                    <strong>How do I view my doctor's post-visit instructions?</strong>
                                    <p style={{ color: 'var(--secondary-text)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                                        Click on **"My Appointments & History"** in the sidebar. Once your doctor completes your consultation, a green **Doctor's Post-Visit Care Summary** card will appear with your care plan and a 1-click PDF download button.
                                    </p>
                                </div>
                                <div>
                                    <strong>What if I need to cancel an appointment?</strong>
                                    <p style={{ color: 'var(--secondary-text)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                                        Contact clinic administration or select an alternate open slot on the booking calendar.
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
