import { Injectable, Logger } from '@nestjs/common';
// import { CognitiveSearchService } from '../cognitive-search/cognitive-search.service';
// import { FunctionDefinition } from '@azure/openai';

@Injectable()
export class EmployeesService {
  // private readonly logger = new Logger(EmployeesService.name);
  //
  //
  // async getEmployeesWorkDetails(
  //   name: string,
  //   certificate: string,
  //   skill: string,
  // ): Promise<any> {
  //   this.logger.log(
  //     `Getting employees professional work experience details based on a given employee name ${name} or certificate ${certificate} or skill ${skill}`,
  //   );
  //   try {
  //     // const response = await this.httpService.get(url).toPromise();
  //     return await this.cognitiveSearchService.doSemanticHybridSearch(
  //       [name, certificate, skill].filter(Boolean).join(' '),
  //     );
  //   } catch (error) {
  //     this.logger.error(error);
  //     throw new Error('Unable to fetch employee work experience details');
  //   }
  // }
  //
  // public getFunctionDefinitions() {
  //   return [this.getEmployeesWorkDetailsFunctionDefinition()];
  // }
  //
  // private getEmployeesWorkDetailsFunctionDefinition(): FunctionDefinition {
  //   return {
  //     name: 'getEmployeesWorkDetails',
  //     description:
  //       'Get the employees professional work experience details based on a given name or certificate or skill',
  //     parameters: {
  //       type: 'object',
  //       properties: {
  //         name: {
  //           type: 'string',
  //           description: 'The employee name',
  //         },
  //         certificate: {
  //           type: 'string',
  //           description: 'The certificate name',
  //         },
  //         skill: {
  //           type: 'string',
  //           description: 'The skill name',
  //         },
  //       },
  //     },
  //   };
  // }
}
