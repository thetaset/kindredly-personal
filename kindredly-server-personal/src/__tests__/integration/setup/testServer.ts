import request from 'supertest';
import App from '@/app';
import {Application} from 'express';

let testApp: Application | null = null;

export function getTestApp(): Application {
  if (!testApp) {
    testApp = new App().app;
  }
  return testApp;
}

export function getTestRequest() {
  return request(getTestApp());
}
