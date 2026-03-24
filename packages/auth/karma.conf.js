/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const karmaBase = require('../../config/karma.base');
const webpackBase = require('../../config/webpack.test');
const { argv } = require('yargs');

module.exports = function (config) {
  const additionalCIFlags = [];
  if (process.env.CI || process.env.ACT) {
    additionalCIFlags.push(
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage'
    );
  }

  // Determine which browsers to use from the base function
  let browsers = getTestBrowsers(argv);

  // Define the name for our CI-friendly launcher
  const ciLauncherName = 'ChromeHeadlessCI';

  // If we are in CI/ACT, and the browsers list includes ChromeHeadless,
  // replace it with our CI-safe version.
  const chromeHeadlessIndex = browsers.indexOf('ChromeHeadless');
  if ((process.env.CI || process.env.ACT) && chromeHeadlessIndex !== -1) {
    browsers = [...browsers]; // Create a copy to modify
    browsers[chromeHeadlessIndex] = ciLauncherName;
  }

  const karmaConfig = {
    ...karmaBase, // Spread the base configuration

    customLaunchers: {
      ...(karmaBase.customLaunchers || {}), // Include other custom launchers from base

      // Define our CI-friendly ChromeHeadless launcher
      [ciLauncherName]: {
        base: 'ChromeHeadless', // Inherits from the base ChromeHeadless
        flags: [
          // Include any flags that might be on ChromeHeadless in karmaBase
          ...(((karmaBase.customLaunchers || {}).ChromeHeadless || {}).flags || []),
          // Add our CI-specific flags
          ...additionalCIFlags
        ]
      }
    },

    browsers: browsers, // Set the potentially modified list of browsers

    files: getTestFiles(argv),
    frameworks: ['mocha'], // Assuming mocha, adjust if necessary
    client: {
      ...(karmaBase.client || {}),
      ...getClientConfig(argv)
    }
    // Other settings like reporters, plugins, etc., are expected to be in karmaBase
  };

  config.set(karmaConfig);
};

function getTestFiles(argv) {
  if (argv.unit) {
    return ['src/**/*.test.ts', 'test/helpers/**/*.test.ts'];
  } else if (argv.integration) {
    if (argv.prodbackend) {
      return [
        'test/integration/flows/totp.test.ts',
        'test/integration/flows/password_policy.test.ts',
        'test/integration/flows/recaptcha_enterprise.test.ts',
        'test/integration/flows/hosting_link.test.ts'
      ];
    }
    return argv.local
      ? ['test/integration/flows/*.test.ts']
      : ['test/integration/flows/*!(local).test.ts'];
  } else if (argv.cordova) {
    return ['src/platform_cordova/**/*.test.ts'];
  } else {
    // For the catch-all yarn:test, ignore the phone integration test
    return [
      'src/**/*.test.ts',
      'test/helpers/**/*.test.ts',
      'test/integration/flows/anonymous.test.ts',
      'test/integration/flows/email.test.ts',
      'test/integration/flows/firebaseserverapp.test.ts'
    ];
  }
}

function getTestBrowsers(argv) {
  let browsers = ['ChromeHeadless'];
  if (process.env?.BROWSERS && argv.unit) {
    browsers = process.env?.BROWSERS?.split(',');
  }
  return browsers;
}

function getClientConfig(argv) {
  if (!argv.local) {
    return {};
  }

  if (!process.env.GCLOUD_PROJECT || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    console.error(
      'Local testing against emulator requested, but ' +
        'GCLOUD_PROJECT and FIREBASE_AUTH_EMULATOR_HOST env variables ' +
        'are missing'
    );
    process.exit(1);
  }

  return {
    authAppConfig: {
      apiKey: 'local-api-key',
      projectId: process.env.GCLOUD_PROJECT,
      authDomain: 'local-auth-domain'
    },
    authEmulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST
  };
}

module.exports.files = getTestFiles(argv);
