export const generateTimeSlots = (workingHours = "9:00-17:00", slotDuration = 30) => {
    const slots = [];
    const [startStr, endStr] = workingHours.split('-');

    const [startHour, startMin] = startStr.trim().split(':').map(Number);
    const [endHour, endMin] = endStr.trim().split(':').map(Number);

    let current = new Date();
    current.setHours(startHour, startMin, 0, 0);

    let end = new Date();
    end.setHours(endHour, endMin, 0, 0);

    while (current < end) {
        const next = new Date(current.getTime() + slotDuration * 60000);
        if (next > end) break;

        const startTime = current.toTimeString().substring(0, 5);
        const endTime = next.toTimeString().substring(0, 5);

        slots.push({ startTime, endTime });
        current = next;
    }
    return slots;
};