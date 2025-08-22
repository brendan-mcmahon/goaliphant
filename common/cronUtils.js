// FREQ:INTERVAL:DAY_SPEC
// • FREQ – indicates whether the recurrence is weekly (W) or monthly (M).
// • INTERVAL – is a positive integer: 1 for every period, 2 for every other period, 3 for every third, etc.
// • DAY_SPEC – identifies the day. For weekly patterns, this might be one or more weekdays (or a range such as "Mon-Fri"). For monthly patterns, DAY_SPEC can be either:
//   – A simple number (e.g. "5" for the 5th day of the month)
//   – Or an ordinal weekday in the form "<ordinal><Weekday>" where the ordinal comes first. For instance, "2Wed" represents "the second Wednesday of the month."

// example:
const rule = {
	FREQ: 'W',
	INTERVAL: 1,
	DAY_SPEC: 'Mon-Fri'
}

function matchesRecurrence(date, rule) {
	if (!(date instanceof Date)) {
		throw new Error("First argument must be a Date");
	}
	const parts = rule.split(':');
	if (parts.length !== 3) {
		throw new Error("Invalid rule format. Expected format: FREQ:INTERVAL:DAY_SPEC");
	}
	const freq = parts[0]; const interval = parseInt(parts[1], 10);
	const daySpec = parts[2];
	if (isNaN(interval) || interval < 1) {
		throw new Error("Invalid interval in rule");
	}

	// Properly define the dayMap
	const dayMap = {
		"Sun": 0, "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6
	};

	if (freq === 'W') { // Weekly recurrence. // Use a fixed baseline date – January 4, 1970 is a Sunday. const baseline = new Date(1970, 0, 4); const msPerWeek = 7 * 24 * 60 * 60 * 1000; const weekDiff = Math.floor((date - baseline) / msPerWeek); // Normalize modulo for negatives const weekRemainder = ((weekDiff % interval) + interval) % interval; if (weekRemainder !== 0) { return false; }

		// Parse the daySpec into an array of allowed weekday numbers.
		let allowedDays = [];
		if (daySpec.indexOf('-') !== -1) {
			// e.g. "Mon-Fri"
			const [startStr, endStr] = daySpec.split('-');
			const start = dayMap[startStr];
			const end = dayMap[endStr];
			if (start === undefined || end === undefined) {
				throw new Error("Invalid weekday range in rule: " + daySpec);
			}
			// Generate range (assumes start <= end)
			for (let i = start; i <= end; i++) {
				allowedDays.push(i);
			}
		} else if (daySpec.indexOf(',') !== -1) {
			// e.g. "Tue,Thu"
			const partsDays = daySpec.split(',');
			for (let d of partsDays) {
				let trimmed = d.trim();
				const dayVal = dayMap[trimmed];
				if (dayVal === undefined) {
					throw new Error("Invalid weekday abbreviation in rule: " + trimmed);
				}
				allowedDays.push(dayVal);
			}
		} else {
			// Single weekday abbreviation, e.g. "Tue"
			const dayVal = dayMap[daySpec];
			if (dayVal === undefined) {
				throw new Error("Invalid weekday abbreviation in rule: " + daySpec);
			}
			allowedDays.push(dayVal);
		}
		const dayOfWeek = date.getDay(); // Get the day of the week for the date being checked.
		return allowedDays.includes(dayOfWeek);
	} else if (freq === 'M') { // Monthly recurrence. // Use a fixed baseline date – January 1, 1970. const baseline = new Date(1970, 0, 1); const monthDiff = (date.getFullYear() - baseline.getFullYear()) * 12 + (date.getMonth() - baseline.getMonth()); const monthRemainder = ((monthDiff % interval) + interval) % interval; if (monthRemainder !== 0) { return false; }

		// If daySpec is only digits, then it is a fixed day-of-month.
		if (/^\d+$/.test(daySpec)) {
			return date.getDate() === parseInt(daySpec, 10);
		}
		// Otherwise assume it is an ordinal weekday like "2Wed" (the second Wednesday)
		else if (/^(\d+)([A-Za-z]{3})$/.test(daySpec)) {
			const match = daySpec.match(/^(\d+)([A-Za-z]{3})$/);
			if (!match) {
				throw new Error("Invalid ordinal daySpec: " + daySpec);
			}
			const ordinal = parseInt(match[1], 10);
			const weekdayAbbr = match[2];
			const targetDayOfWeek = dayMap[weekdayAbbr];
			if (targetDayOfWeek === undefined) {
				throw new Error("Invalid weekday abbreviation in ordinal rule: " + weekdayAbbr);
			}
			// Compute the nth occurrence of targetDayOfWeek in this month.
			const year = date.getFullYear();
			const month = date.getMonth();
			const firstOfMonth = new Date(year, month, 1);
			const firstDayWeek = firstOfMonth.getDay();
			// Calculate offset (in days) from the first of the month to the first occurrence of targetDayOfWeek.
			const offset = (targetDayOfWeek - firstDayWeek + 7) % 7;
			// The nth occurrence will be:
			const nthDate = 1 + offset + (ordinal - 1) * 7;
			// Validate the computed day exists in this month
			const lastDate = new Date(year, month + 1, 0).getDate();
			if (nthDate > lastDate) {
				return false;
			}
			return (date.getDate() === nthDate && date.getDay() === targetDayOfWeek);
		} else {
			throw new Error("Invalid daySpec in monthly rule: " + daySpec);
		}
	} else { throw new Error("Invalid frequency type in rule: " + freq); }
}


function shouldShowRecurringGoalToday(goal) {
	if (!goal.isRecurring || !goal.recurrencePattern) {
		return false;
	}

	try {
		const today = new Date();
		return matchesRecurrence(today, goal.recurrencePattern);
	} catch (error) {
		console.error(`Error evaluating recurrence pattern for goal: ${goal.text}`, error);
		return false; // Default to not showing if there's an error
	}
}

// Export the functions
exports.shouldShowRecurringGoalToday = shouldShowRecurringGoalToday;
exports.matchesRecurrence = matchesRecurrence;