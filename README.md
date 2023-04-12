<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

🤖💬 **OpenAI** integrated **Devoteam Parking Application** based on
[Nest](https://github.com/nestjs/nest) TypeScript framework.
Started as bot project turned into full fledge server side application.

## Installation

```bash
$ yarn install
```

## Running the app

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## Test

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Features of app
### Technical
- OAuth2 implementation, requires for communication with Google APIs
- JWT token (User session management)
- Modulerarized code
- DB repository configured
- TypeScript enabled
- Nest framework to support MVC patter
- Example on how auotmation script can talk to AWS or Google APIs.
- Parallel service/API call outs
- OpenAI integrated

### Business
- Reads SpreadSheet content, identifies parking spot for each day.
- Reminds employee regarding their parking spot for next day.
- GPT backed chat feature.


## ToDO
### Technical
- [ ] CICD, Automated infrastructure and deployment pipeline
- [ ] Development experience to Dev (Skills required to support backstage)
- [ ] Most important use this base project to create in-house apps i.e. Cloud fitness framework for Azure, GCP or AWS.
- [ ] proxy project that takes away Oauth2 complexity out of the small DevOps script (Consultants requirement)
- [ ] Introduce similar application in Python or GoLang, as DevOps usually prefers that over Node.
- [ ] move some code form appcontroller to specific controller
- [ ] Move infrastructure to private DB connection
- [ ] Change email sender from Hardik to no-reply
- [ ] store chat history for follow up and start new thread after few messages
- [ ] build correct inventory that Bot can understand today,tomorrow

### Business
- [ ] Frontend for users to manage their parking
- [ ] Allow user to remove their reservation just by clicking on link in email.
- [ ] Move from email to chat notification
- [ ] Improve chat integration experience. initial message from bot to explain what it can do and what it cannot do.
- [ ] Extend functionality to seat occupation
- [ ] User should not need to fill whole email id, just get it from google contacts
- [ ] Remind users when the reserve parking but not desk
- [ ] waiting list for parking spot
- [ ] Allow user to set watch on parking spot for specific date
- [ ] Allow user to reserve parking from chat
- [ ] Allow user to cancel their reservation from chat
- [ ] get email from history and send it to chat
- [ ] timeslot for parking with two slots

## Cons
- [ ] Chat messages could be expensive, we need to launch on trial basis, per individual
- [ ] Lack of JavaScript/TypeScript/NodeJS skill (same draw back as backstage.io)
- [ ] Lack of development experience within DevOps
- [ ] GPT model hallucinates a lot

## License

Nest is [MIT licensed](LICENSE).
