import { HttpStatus } from '@nestjs/common';
import { TestingModuleBuilder } from '@nestjs/testing';

import { TestService } from '../test/test.service';
import { UtilService } from '../util/util.service';
import { HttpsService } from './https.service';

TestService.createSandbox({
  name: 'HttpsService',
  providers: [ HttpsService, UtilService ],

  descriptor: (testingBuilder: TestingModuleBuilder) => {
    let httpsService: HttpsService;

    beforeEach(async () => {
      const testingModule = await testingBuilder.compile();
      httpsService = await testingModule.resolve(HttpsService);
    });

    describe('request', () => {

      it('it should GET Google homepage', async () => {
        httpsService.setupInstance({
          bases: { url: 'https://www.google.com' },
        });
        const data = await httpsService.get('/');
        expect(data).toMatch(/google/gi);
      });

      it('it should throw a timeout exception', async () => {
        let errorMessage: string;
        httpsService.setupInstance({
          bases: { url: 'https://www.google.com' },
          defaults: { timeout: 1 },
        });
        try {
          await httpsService.get('/');
        }
        catch (e) {
          errorMessage = e.message;
        }
        expect(errorMessage).toMatch(/timed out/gi);
      });

      it('it should throw an internal server error exception', async () => {
        let errorStatus: number;
        httpsService.setupInstance({
          bases: { url: 'https://www.google.com' },
        });
        try {
          await httpsService.get('/path-that-certainly-does-not-exist');
        }
        catch (e) {
          errorStatus = e.status;
        }
        expect(errorStatus).toEqual(HttpStatus.INTERNAL_SERVER_ERROR);
      });

    });

  },

});
