import knex from 'knex';
import {config} from '@/config';
const myknex = knex(config.db);

export default myknex;
