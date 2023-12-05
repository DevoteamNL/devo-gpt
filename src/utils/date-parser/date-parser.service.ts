import { Injectable } from '@nestjs/common';

@Injectable()
export class DateParserService {
  convertDateToText(dateString: string): string {
    // Parse the date string and add a year
    const parsedDate: Date = new Date(Date.parse('2023-' + dateString));
    // Create a new Date object with the current date and time
    const currentDate: Date = new Date();
    // Get the day, month, and year of the current date
    const currentDay: number = currentDate.getDate();
    const currentMonth: number = currentDate.getMonth() + 1; // January is 0
    const currentYear: number = currentDate.getFullYear();
    // Create a new Date object with the current date only
    const currentDateOnly: Date = new Date(
      currentYear,
      currentMonth - 1,
      currentDay,
    );
    // Get the difference in days between the parsed date and the current date only
    const difference: number =
      (parsedDate.getTime() - currentDateOnly.getTime()) / 86400000;
    // Return different texts based on the difference in days
    switch (difference) {
      case -2:
        return 'the day before yesterday';
      case -1:
        return 'yesterday';
      case 0:
        return 'today';
      case 1:
        return 'tomorrow';
      case 2:
        return 'day after tomorrow';
      default:
        return '';
    }
  }
}
