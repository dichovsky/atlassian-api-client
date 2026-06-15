import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConfigurationResource,
  type Configuration,
  type TimeTrackingConfiguration,
  type TimeTrackingProvider,
} from '../../src/jira/resources/configuration.js';
import { MockTransport } from '../helpers/mock-transport.js';

const BASE_URL = 'https://test.atlassian.net/rest/api/3';

const makeConfig = (overrides: Partial<Configuration> = {}): Configuration => ({
  votingEnabled: true,
  watchingEnabled: true,
  unassignedIssuesAllowed: false,
  subTasksEnabled: true,
  issueLinkingEnabled: true,
  timeTrackingEnabled: true,
  attachmentsEnabled: true,
  ...overrides,
});

const makeProvider = (overrides: Partial<TimeTrackingProvider> = {}): TimeTrackingProvider => ({
  key: 'JIRA',
  name: 'JIRA provided time tracking',
  ...overrides,
});

const makeOptions = (
  overrides: Partial<TimeTrackingConfiguration> = {},
): TimeTrackingConfiguration => ({
  workingHoursPerDay: 8,
  workingDaysPerWeek: 5,
  timeFormat: 'pretty',
  defaultUnit: 'hour',
  ...overrides,
});

describe('ConfigurationResource', () => {
  let transport: MockTransport;
  let resource: ConfigurationResource;

  beforeEach(() => {
    transport = new MockTransport();
    resource = new ConfigurationResource(transport, BASE_URL);
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', () => {
    it('calls GET /configuration and returns the global config', async () => {
      // Arrange
      const config = makeConfig({
        timeTrackingConfiguration: makeOptions(),
      });
      transport.respondWith(config);

      // Act
      const result = await resource.get();

      // Assert
      expect(result).toEqual(config);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/configuration`,
      });
    });

    it('handles configs without timeTrackingConfiguration', async () => {
      // Arrange
      const config = makeConfig({ timeTrackingEnabled: false });
      transport.respondWith(config);

      // Act
      const result = await resource.get();

      // Assert
      expect(result.timeTrackingConfiguration).toBeUndefined();
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(resource.get()).rejects.toThrow('network error');
    });
  });

  // ── getTimeTracking ───────────────────────────────────────────────────────

  describe('getTimeTracking()', () => {
    it('calls GET /configuration/timetracking and returns the current provider', async () => {
      // Arrange
      const provider = makeProvider();
      transport.respondWith(provider);

      // Act
      const result = await resource.getTimeTracking();

      // Assert
      expect(result).toEqual(provider);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/configuration/timetracking`,
      });
    });

    it('returns null when time tracking is disabled (204 No Content)', async () => {
      // Arrange — 204 yields null/undefined data
      transport.respondWith(null, 204);

      // Act
      const result = await resource.getTimeTracking();

      // Assert
      expect(result).toBeNull();
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('server error'));

      // Act / Assert
      await expect(resource.getTimeTracking()).rejects.toThrow('server error');
    });
  });

  // ── selectTimeTracking ────────────────────────────────────────────────────

  describe('selectTimeTracking()', () => {
    it('calls PUT /configuration/timetracking with the provider body and returns void', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      const result = await resource.selectTimeTracking({ key: 'JIRA' });

      // Assert
      expect(result).toBeUndefined();
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/configuration/timetracking`,
        body: { key: 'JIRA' },
      });
    });

    it('passes optional name field', async () => {
      // Arrange
      transport.respondWith(undefined);

      // Act
      await resource.selectTimeTracking({
        key: 'com.acme.tracker',
        name: 'Acme Tracker',
      });

      // Assert
      expect(transport.lastCall?.options.body).toEqual({
        key: 'com.acme.tracker',
        name: 'Acme Tracker',
      });
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('forbidden'));

      // Act / Assert
      await expect(resource.selectTimeTracking({ key: 'JIRA' })).rejects.toThrow('forbidden');
    });
  });

  // ── listTimeTrackingProviders ─────────────────────────────────────────────

  describe('listTimeTrackingProviders()', () => {
    it('calls GET /configuration/timetracking/list and returns providers', async () => {
      // Arrange
      const providers = [makeProvider(), makeProvider({ key: 'com.acme', name: 'Acme' })];
      transport.respondWith(providers);

      // Act
      const result = await resource.listTimeTrackingProviders();

      // Assert
      expect(result).toEqual(providers);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/configuration/timetracking/list`,
      });
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('network error'));

      // Act / Assert
      await expect(resource.listTimeTrackingProviders()).rejects.toThrow('network error');
    });
  });

  // ── getTimeTrackingOptions ────────────────────────────────────────────────

  describe('getTimeTrackingOptions()', () => {
    it('calls GET /configuration/timetracking/options and returns the options', async () => {
      // Arrange
      const options = makeOptions();
      transport.respondWith(options);

      // Act
      const result = await resource.getTimeTrackingOptions();

      // Assert
      expect(result).toEqual(options);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'GET',
        path: `${BASE_URL}/configuration/timetracking/options`,
      });
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('server error'));

      // Act / Assert
      await expect(resource.getTimeTrackingOptions()).rejects.toThrow('server error');
    });
  });

  // ── updateTimeTrackingOptions ─────────────────────────────────────────────

  describe('updateTimeTrackingOptions()', () => {
    it('calls PUT /configuration/timetracking/options with the body and returns the updated options', async () => {
      // Arrange — all four fields are required by the spec (B1055/1).
      const options = makeOptions({ workingHoursPerDay: 7.5, defaultUnit: 'minute' });
      transport.respondWith(options);

      // Act
      const result = await resource.updateTimeTrackingOptions({
        workingHoursPerDay: 7.5,
        workingDaysPerWeek: 5,
        timeFormat: 'pretty',
        defaultUnit: 'minute',
      });

      // Assert
      expect(result).toEqual(options);
      expect(transport.lastCall?.options).toMatchObject({
        method: 'PUT',
        path: `${BASE_URL}/configuration/timetracking/options`,
        body: {
          workingHoursPerDay: 7.5,
          workingDaysPerWeek: 5,
          timeFormat: 'pretty',
          defaultUnit: 'minute',
        },
      });
    });

    it('sends all four required fields in the body', async () => {
      // Arrange
      transport.respondWith(makeOptions());

      // Act
      await resource.updateTimeTrackingOptions({
        workingHoursPerDay: 8,
        workingDaysPerWeek: 5,
        timeFormat: 'days',
        defaultUnit: 'day',
      });

      // Assert
      expect(transport.lastCall?.options.body).toEqual({
        workingHoursPerDay: 8,
        workingDaysPerWeek: 5,
        timeFormat: 'days',
        defaultUnit: 'day',
      });
    });

    it('propagates transport errors', async () => {
      // Arrange
      transport.respondWithError(new Error('forbidden'));

      // Act / Assert
      await expect(
        resource.updateTimeTrackingOptions({
          workingHoursPerDay: 8,
          workingDaysPerWeek: 5,
          timeFormat: 'pretty',
          defaultUnit: 'hour',
        }),
      ).rejects.toThrow('forbidden');
    });
  });
});
