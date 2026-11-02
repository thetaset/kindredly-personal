import {
  appSiteGrantKey,
  isAppSiteGrantKey,
  matchCheckedService,
  parseAppSiteGrantKey,
} from '../src/app-outside-services';

describe('matchCheckedService', () => {
  it('matches a forecast and a place search on Open-Meteo', () => {
    const forecast = matchCheckedService('https://api.open-meteo.com/v1/forecast?latitude=52.5&longitude=13.4&current=temperature_2m');
    expect(forecast?.service.id).toBe('open-meteo');
    expect(forecast?.host.keyedHost).toBe('customer-api.open-meteo.com');

    const search = matchCheckedService('https://geocoding-api.open-meteo.com/v1/search?name=Berlin');
    expect(search?.host.host).toBe('geocoding-api.open-meteo.com');
  });

  it('matches the host whatever its case', () => {
    expect(matchCheckedService('https://API.Open-Meteo.com/v1/forecast?latitude=1&longitude=2')).not.toBeNull();
  });

  it('refuses anything that is not a GET', () => {
    expect(matchCheckedService('https://api.open-meteo.com/v1/forecast', 'POST')).toBeNull();
    expect(matchCheckedService('https://api.open-meteo.com/v1/forecast', 'HEAD')).toBeNull();
  });

  it('refuses another path, another host, http, a port and a user name', () => {
    expect(matchCheckedService('https://api.open-meteo.com/v1/archive?latitude=1')).toBeNull();
    expect(matchCheckedService('https://api.open-meteo.com/v1/forecast/../../x')).toBeNull();
    expect(matchCheckedService('https://evil.example/v1/forecast')).toBeNull();
    expect(matchCheckedService('https://api.open-meteo.com.evil.example/v1/forecast')).toBeNull();
    expect(matchCheckedService('http://api.open-meteo.com/v1/forecast')).toBeNull();
    expect(matchCheckedService('https://api.open-meteo.com:8443/v1/forecast')).toBeNull();
    expect(matchCheckedService('https://me@api.open-meteo.com/v1/forecast')).toBeNull();
  });

  it('refuses nonsense and an overlong address', () => {
    expect(matchCheckedService('')).toBeNull();
    expect(matchCheckedService('not a url')).toBeNull();
    expect(matchCheckedService(`https://api.open-meteo.com/v1/forecast?x=${'a'.repeat(2100)}`)).toBeNull();
  });
});

describe('site grant keys', () => {
  it('round-trips a site', () => {
    const key = appSiteGrantKey('fetch', 'API.Example.com');
    expect(key).toBe('net.fetch.api.example.com');
    expect(parseAppSiteGrantKey(key)).toEqual({kind: 'fetch', host: 'api.example.com'});
    expect(parseAppSiteGrantKey('net.send.localhost')).toEqual({kind: 'send', host: 'localhost'});
  });

  it('refuses a device capability and anything that is not a host name', () => {
    expect(isAppSiteGrantKey('location')).toBe(false);
    expect(isAppSiteGrantKey('net.withLocation')).toBe(false);
    expect(isAppSiteGrantKey('net.fetch.')).toBe(false);
    expect(isAppSiteGrantKey('net.fetch.bad host')).toBe(false);
    expect(isAppSiteGrantKey('net.fetch.-bad.com')).toBe(false);
    expect(isAppSiteGrantKey('net.post.example.com')).toBe(false);
  });
});
