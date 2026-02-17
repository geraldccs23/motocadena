import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ADMIN_BASE } from '../lib/api';
import { Service } from '../types';

export interface AvailabilitySlot {
    key: string;
    label: string;
    start_iso: string;
    duration_minutes: number;
    occupied: number;
    capacity: number;
    full: boolean;
}

export function useAppointmentAvailability(serviceId?: string) {
    const [services, setServices] = useState<Service[]>([]);
    const [loadingServices, setLoadingServices] = useState(false);
    const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
    const [loadingAvailability, setLoadingAvailability] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadServices = useCallback(async () => {
        setLoadingServices(true);
        try {
            const resp = await fetch(`${ADMIN_BASE}/public/services`);
            if (!resp.ok) throw new Error('Failed to fetch services');
            const json = await resp.json();
            setServices(json?.services || []);
        } catch (err) {
            console.warn('Backend services fail, falling back to Supabase', err);
            const { data, error: sErr } = await supabase
                .from('services')
                .select('*')
                .order('name');
            if (sErr) {
                setError('Error loading services');
            } else {
                setServices(data || []);
            }
        } finally {
            setLoadingServices(false);
        }
    }, []);

    const loadAvailability = useCallback(async (dateStr: string) => {
        if (!dateStr) {
            setAvailabilitySlots([]);
            return;
        }

        setLoadingAvailability(true);
        setError(null);

        try {
            const url = new URL(`${ADMIN_BASE}/public/appointments/availability`);
            url.searchParams.set('date', dateStr);
            const resp = await fetch(url.toString());
            if (!resp.ok) throw new Error('Failed to fetch availability');
            const json = await resp.json();
            setAvailabilitySlots(json?.slots || []);
        } catch (err) {
            console.warn('Backend availability fail, falling back to Supabase', err);
            // Fallback logic for availability using Supabase
            try {
                const selectedService = services.find(s => s.id === serviceId);
                const duration = Math.max(30, Number(selectedService?.estimated_duration_min ?? 60));

                const start = new Date(dateStr + 'T00:00');
                const end = new Date(dateStr + 'T00:00');
                end.setDate(end.getDate() + 1);

                const { data, error: apptErr } = await supabase
                    .from('appointments')
                    .select('scheduled_at, status')
                    .gte('scheduled_at', start.toISOString())
                    .lt('scheduled_at', end.toISOString());

                if (apptErr) throw apptErr;
                const appts = (data || []) as any[];

                // Simple slot generation for fallback
                const slots: AvailabilitySlot[] = [];
                let current = new Date(start);
                current.setHours(8, 0, 0, 0); // Start at 8 AM
                const dayEnd = new Date(start);
                dayEnd.setHours(18, 0, 0, 0); // End at 6 PM

                while (current < dayEnd) {
                    const next = new Date(current);
                    next.setMinutes(next.getMinutes() + duration);
                    if (next > dayEnd) break;

                    const startIso = current.toISOString();
                    const occupiedCount = appts.filter(
                        a => a.scheduled_at === startIso && a.status !== 'cancelled'
                    ).length;

                    const formatTime = (d: Date) => {
                        const h = d.getHours();
                        const m = d.getMinutes();
                        const ampm = h >= 12 ? 'pm' : 'am';
                        const hh = ((h + 11) % 12) + 1;
                        const mm = String(m).padStart(2, '0');
                        return `${hh}:${mm} ${ampm}`;
                    };

                    slots.push({
                        key: `${current.getHours()}-${current.getMinutes()}`,
                        label: `${formatTime(current)} – ${formatTime(next)}`,
                        start_iso: startIso,
                        duration_minutes: duration,
                        occupied: occupiedCount,
                        capacity: 3, // Default capacity
                        full: occupiedCount >= 3
                    });
                    current = next;
                }
                setAvailabilitySlots(slots);
            } catch (be) {
                console.error('Full fallback failed:', be);
                setError('No se pudo cargar la disponibilidad');
            }
        } finally {
            setLoadingAvailability(false);
        }
    }, [services, serviceId]);

    useEffect(() => {
        loadServices();
    }, [loadServices]);

    return {
        services,
        loadingServices,
        availabilitySlots,
        loadingAvailability,
        error,
        loadAvailability,
        loadServices
    };
}
