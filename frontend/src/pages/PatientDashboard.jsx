import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/authContext.jsx';
import API from '../services/api.js';
import { Calendar, Clock, User, Sparkles, CheckCircle, AlertCircle, LogOut, Download, FileText, History } from 'lucide-react';

const PatientDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

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

    // Fetch available doctors and patient appointment history
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
            // 1. Atomic Booking Transaction
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

            // 2. Trigger Gemini 2.5 Flash Pre-Visit AI Urgency Brief
            const aiRes = await API.post('/llm/pre-visit', { appointmentId });
            setAiSummary(aiRes.data.data);

            // Refresh appointment history list
            fetchMyAppointments();

        } catch (err) {
            setError(err.response?.data?.message || 'Failed to book appointment.');
        } finally {
            setBookingLoading(false);
        }
    };

    const exportSummaryToPDF = (summary, apptDetails) => {
        const printWindow = window.open('', '_blank');
        const content = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>ClinicCare - Patient Medical Visit Summary</title>
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
                        <div class="title">ClinicCare AI Health Summary</div>
                        <div style="font-size: 12px; color: #718096; margin-top: 4px;">Official Patient Pre-Visit Medical Record</div>
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
                    <div class="section-title">Chief Complaint & Reported Symptoms</div>
                    <p>${summary?.chiefComplaint || apptDetails?.symptoms || 'N/A'}</p>
                </div>

                ${summary?.questions && summary.questions.length > 0 ? `
                <div class="section">
                    <div class="section-title">Suggested Consultation Questions for Doctor</div>
                    <ul>
                        ${summary.questions.map(q => `<li>${q}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}

                <div class="footer">
                    This document was generated by ClinicCare AI Health System on ${new Date().toLocaleDateString()}.
                </div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
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
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            {/* Header */}
            <header className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ color: 'var(--primary-blue)', fontSize: '1.8rem' }}>Patient Portal</h1>
                    <p style={{ color: 'var(--secondary-text)', fontSize: '0.95rem' }}>Welcome back, <strong>{user?.name}</strong>!</p>
                </div>
                <button onClick={handleLogout} className="btn-primary" style={{ background: 'transparent', color: 'var(--secondary-text)', border: '1px solid rgba(108, 114, 172, 0.3)' }}>
                    <LogOut size={18} /> Log Out
                </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                {/* Left Column: Doctor Selection & Time Slot Picker */}
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

                    {/* Time Slot Picker */}
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

                {/* Right Column: Symptom Form & AI Pre-Visit Brief Card */}
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

                    {/* Gemini AI Pre-Visit Summary Card */}
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

                            {/* 1-Click PDF Export Button */}
                            <button
                                onClick={() => exportSummaryToPDF(aiSummary, lastAppointment)}
                                className="btn-orange"
                                style={{ width: '100%', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <Download size={18} /> Download AI Brief PDF
                            </button>
                        </div>
                    )}

                </div>

            </div>

            {/* Bottom Row: Patient Appointment History Timeline */}
            <div className="glass-card" style={{ marginTop: '2rem' }}>
                <h3 style={{ color: 'var(--primary-blue)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <History size={20} /> My Appointment History
                </h3>

                {loadingAppointments ? (
                    <p style={{ color: 'var(--secondary-text)' }}>Loading past appointments...</p>
                ) : myAppointments.length === 0 ? (
                    <p style={{ color: 'var(--secondary-text)', fontSize: '0.9rem' }}>No past appointments found. Book your first appointment above!</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {myAppointments.map((appt) => (
                            <div
                                key={appt.id}
                                style={{
                                    padding: '1.2rem',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'rgba(255, 255, 255, 0.7)',
                                    border: '1px solid rgba(108, 114, 172, 0.15)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '1rem'
                                }}
                            >
                                <div style={{ flex: '1', minWidth: '240px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                                        <strong style={{ color: 'var(--text-dark)', fontSize: '1rem' }}>
                                            {appt.doctor?.user?.name || 'Doctor'}
                                        </strong>
                                        <span style={{ fontSize: '0.75rem', background: appt.status === 'CONFIRMED' || appt.status === 'CONFIRM' ? 'rgba(46, 139, 87, 0.15)' : 'rgba(108, 114, 172, 0.15)', color: appt.status === 'CONFIRMED' || appt.status === 'CONFIRM' ? 'var(--accent-green)' : 'var(--primary-blue)', padding: '0.2rem 0.6rem', borderRadius: '10px', fontWeight: '600' }}>
                                            {appt.status}
                                        </span>
                                    </div>
                                    <p style={{ color: 'var(--secondary-text)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                                        📅 {appt.slot?.date} at 🕒 {appt.slot?.startTime} - {appt.slot?.endTime}
                                    </p>
                                    <p style={{ color: 'var(--text-dark)', fontSize: '0.88rem' }}>
                                        <strong>Symptoms:</strong> {appt.symptoms}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    {appt.llmSummaries && appt.llmSummaries.length > 0 && (
                                        <button
                                            onClick={() => {
                                                const preVisit = appt.llmSummaries.find(s => s.type === 'PRE_VISIT');
                                                let parsedContent = {};
                                                try { parsedContent = JSON.parse(preVisit?.content || '{}'); } catch(e) { parsedContent = { chiefComplaint: appt.symptoms }; }
                                                exportSummaryToPDF(parsedContent, {
                                                    doctorName: appt.doctor?.user?.name,
                                                    date: appt.slot?.date,
                                                    startTime: appt.slot?.startTime,
                                                    symptoms: appt.symptoms
                                                });
                                            }}
                                            className="btn-primary"
                                            style={{ fontSize: '0.82rem', padding: '0.5rem 0.9rem', gap: '0.4rem' }}
                                        >
                                            <FileText size={16} /> Export PDF
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
};

export default PatientDashboard;
