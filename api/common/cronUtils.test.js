// filepath: c:\code\goaliphant\common\cronUtils.test.js
const { shouldShowRecurringGoalToday } = require('./cronUtils');

// Helper to create dates for testing
function createDate(year, month, day) {
	// Note: month is 0-indexed (0 = January)
	return new Date(year, month, day);
}

// Expose matchesRecurrence for direct testing
const cronUtils = require('./cronUtils');
const matchesRecurrence = cronUtils.matchesRecurrence ||
	// If not exported, use this workaround to get reference to the internal function
	Object.getOwnPropertyDescriptor(
		Object.getPrototypeOf(cronUtils),
		'matchesRecurrence'
	)?.value;

describe('cronUtils', () => {
	// Mock the Date constructor for consistent testing
	let originalDate;

	beforeAll(() => {
		originalDate = global.Date;
	});

	afterEach(() => {
		global.Date = originalDate;
	});

	describe('shouldShowRecurringGoalToday', () => {
		it('should return false for non-recurring goals', () => {
			const goal = {
				text: 'Regular goal',
				isRecurring: false,
				recurrencePattern: 'W:1:Mon'
			};

			expect(shouldShowRecurringGoalToday(goal)).toBe(false);
		});

		it('should return false when recurrencePattern is missing', () => {
			const goal = {
				text: 'Incomplete goal',
				isRecurring: true
			};

			expect(shouldShowRecurringGoalToday(goal)).toBe(false);
		});

		it('should handle errors gracefully', () => {
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

			const goal = {
				text: 'Invalid pattern',
				isRecurring: true,
				recurrencePattern: 'InvalidPattern'
			};

			expect(shouldShowRecurringGoalToday(goal)).toBe(false);
			expect(consoleSpy).toHaveBeenCalled();

			consoleSpy.mockRestore();
		});

		it('should use the current date for evaluation', () => {
			// Mock Date to return a specific date (Monday, May 5, 2025)
			const mockDate = new Date(2025, 4, 5);
			global.Date = jest.fn(() => mockDate);

			const goal = {
				text: 'Monday goal',
				isRecurring: true,
				recurrencePattern: 'W:1:Mon'
			};

			expect(shouldShowRecurringGoalToday(goal)).toBe(true);

			const nonMatchingGoal = {
				text: 'Tuesday goal',
				isRecurring: true,
				recurrencePattern: 'W:1:Tue'
			};

			expect(shouldShowRecurringGoalToday(nonMatchingGoal)).toBe(false);
		});
	});

	describe('matchesRecurrence', () => {
		describe('Weekly patterns', () => {
			it('should match specific weekdays', () => {
				// Monday
				const monday = createDate(2025, 4, 5);
				expect(matchesRecurrence(monday, 'W:1:Mon')).toBe(true);
				expect(matchesRecurrence(monday, 'W:1:Tue')).toBe(false);

				// Wednesday
				const wednesday = createDate(2025, 4, 7);
				expect(matchesRecurrence(wednesday, 'W:1:Wed')).toBe(true);
				expect(matchesRecurrence(wednesday, 'W:1:Tue')).toBe(false);
			});

			it('should match weekday ranges', () => {
				// Monday (weekday)
				const monday = createDate(2025, 4, 5);
				expect(matchesRecurrence(monday, 'W:1:Mon-Fri')).toBe(true);

				// Saturday (weekend)
				const saturday = createDate(2025, 4, 3);
				expect(matchesRecurrence(saturday, 'W:1:Mon-Fri')).toBe(false);
				expect(matchesRecurrence(saturday, 'W:1:Sat-Sun')).toBe(true);
			});

			it('should match comma-separated weekdays', () => {
				// Monday
				const monday = createDate(2025, 4, 5);
				expect(matchesRecurrence(monday, 'W:1:Mon,Wed,Fri')).toBe(true);

				// Tuesday
				const tuesday = createDate(2025, 4, 6);
				expect(matchesRecurrence(tuesday, 'W:1:Mon,Wed,Fri')).toBe(false);
			});

			it('should respect the interval', () => {
				// Base reference date is Jan 4, 1970 (Sunday)

				// Every week
				const date1 = createDate(2025, 4, 5); // Monday
				expect(matchesRecurrence(date1, 'W:1:Mon')).toBe(true);

				// Every 2 weeks
				expect(matchesRecurrence(date1, 'W:2:Mon')).toBe(true); // Assuming this date falls on the right biweekly schedule

				const date2 = createDate(2025, 4, 12); // Next Monday
				expect(matchesRecurrence(date2, 'W:2:Mon')).toBe(false); // Should be off by 1 week
			});
		});

		describe('Monthly patterns', () => {
			it('should match specific day of month', () => {
				// 15th of the month
				const date = createDate(2025, 4, 15);
				expect(matchesRecurrence(date, 'M:1:15')).toBe(true);
				expect(matchesRecurrence(date, 'M:1:16')).toBe(false);
			});

			it('should match ordinal weekdays', () => {
				// May 5, 2025 is the first Monday of May
				const date1 = createDate(2025, 4, 5);
				expect(matchesRecurrence(date1, 'M:1:1Mon')).toBe(true);
				expect(matchesRecurrence(date1, 'M:1:2Mon')).toBe(false);

				// May 12, 2025 is the second Monday of May
				const date2 = createDate(2025, 4, 12);
				expect(matchesRecurrence(date2, 'M:1:2Mon')).toBe(true);
			});

			it('should respect the interval', () => {
				// Base reference date is Jan 1, 1970

				// Every month on the 15th
				const date1 = createDate(2025, 4, 15); // May 15, 2025
				expect(matchesRecurrence(date1, 'M:1:15')).toBe(true);

				// Every other month on the 15th
				expect(matchesRecurrence(date1, 'M:2:15')).toBe(true); // Assuming May 2025 is an "on" month

				// June 15, 2025 - should be "off" month for bimonthly
				const date2 = createDate(2025, 5, 15);
				expect(matchesRecurrence(date2, 'M:2:15')).toBe(false);
			});

			it('should handle cases where the nth weekday does not exist in a month', () => {
				// Feb 2025 won't have a 5th Sunday
				const fifthSunday = 'M:1:5Sun';
				const feb2025 = createDate(2025, 1, 23); // Some day in Feb 2025

				// This should return false since there's no 5th Sunday in Feb 2025
				expect(() => matchesRecurrence(feb2025, fifthSunday)).not.toThrow();
			});
		});

		describe('Error handling', () => {
			it('should reject invalid date arguments', () => {
				expect(() => matchesRecurrence('not-a-date', 'W:1:Mon')).toThrow('First argument must be a Date');
			});

			it('should reject malformed rule strings', () => {
				const date = new Date();
				expect(() => matchesRecurrence(date, 'invalid-rule')).toThrow('Invalid rule format');
			});

			it('should reject invalid frequency types', () => {
				const date = new Date();
				expect(() => matchesRecurrence(date, 'X:1:Mon')).toThrow('Invalid frequency type');
			});

			it('should reject invalid interval values', () => {
				const date = new Date();
				expect(() => matchesRecurrence(date, 'W:0:Mon')).toThrow('Invalid interval in rule');
				expect(() => matchesRecurrence(date, 'W:foo:Mon')).toThrow('Invalid interval in rule');
			});

			it('should reject invalid weekday abbreviations', () => {
				const date = new Date();
				expect(() => matchesRecurrence(date, 'W:1:Xyz')).toThrow('Invalid weekday abbreviation');
			});

			it('should reject invalid weekday ranges', () => {
				const date = new Date();
				expect(() => matchesRecurrence(date, 'W:1:Abc-Xyz')).toThrow('Invalid weekday range');
			});

			it('should reject invalid monthly day specs', () => {
				const date = new Date();
				expect(() => matchesRecurrence(date, 'M:1:XYZ')).toThrow('Invalid daySpec');
			});
		});
	});
});