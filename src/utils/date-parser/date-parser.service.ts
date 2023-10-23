import { Injectable } from '@nestjs/common';

@Injectable()
export class DateParserService {
  convertDateToText(dateString: string): string {
    // Parse the date string and add a year
    let parsedDate: Date = new Date(Date.parse('2023-' + dateString));
    // Create a new Date object with the current date and time
    let currentDate: Date = new Date();
    // Get the day, month, and year of the current date
    let currentDay: number = currentDate.getDate();
    let currentMonth: number = currentDate.getMonth() + 1; // January is 0
    let currentYear: number = currentDate.getFullYear();
    // Create a new Date object with the current date only
    let currentDateOnly: Date = new Date(
      currentYear,
      currentMonth - 1,
      currentDay,
    );
    // Get the difference in days between the parsed date and the current date only
    let difference: number =
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
