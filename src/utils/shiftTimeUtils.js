/**
 * @param {{ fromHour: number, toHour: number }} shift
 * @param {number} from
 * @param {number} to
 */
export function isConflictingTimeRange(shift, from, to) {
    return (
        (from >= shift.fromHour && from < shift.toHour) ||
        (to > shift.fromHour && to <= shift.toHour) ||
        (from <= shift.fromHour && to >= shift.toHour) ||
        (from >= shift.fromHour && to <= shift.toHour)
    );
}

/**
 * @param {number} dayId
 * @param {number} from
 * @param {number} to
 * @param {Array<{ dayId: number, fromHour: number, toHour: number }>} existingShifts
 */
export function hasConflictOnDay(dayId, from, to, existingShifts) {
    return existingShifts.some(
        (s) => s.dayId === dayId && isConflictingTimeRange(s, from, to),
    );
}
