import mysql from "mysql";
import {promisify} from "util";
import {MYSQLData} from "./Config.js";

var pool = mysql.createPool(MYSQLData);
export const query = promisify(pool.query).bind(pool);
