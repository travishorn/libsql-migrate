import { createClient as _createClient } from "@libsql/client";

/**
 * Creates a wrapped libsql client that transparently converts named parameters
 * to positional parameters, working around a known libsql bug when syncing through Turso.
 * @param {Object} config - The connection configuration for the client.
 * @returns {Object} The wrapped client.
 */
export default function createClient(config) {
	const client = _createClient(config);

	const originalExecute = client.execute.bind(client);
	client.execute = (statement) => {
		return originalExecute(normalizeStatement(statement));
	};

	const originalBatch = client.batch.bind(client);
	client.batch = (statements) => {
		const stmts = Array.isArray(statements) ? statements.map(normalizeStatement) : [normalizeStatement(statements)];
		return originalBatch(stmts);
	};

	const originalTransaction = client.transaction.bind(client);
	client.transaction = async (...args) => {
		const tx = await originalTransaction(...args);

		const txExecute = tx.execute.bind(tx);
		const txBatch = tx.batch.bind(tx);

		tx.execute = (statement) => txExecute(normalizeStatement(statement));

		tx.batch = (statements) => {
			const stmts = Array.isArray(statements) ? statements.map(normalizeStatement) : [normalizeStatement(statements)];
			return txBatch(stmts);
		};

		return tx;
	};

	return client;
}

/**
 * Infer binding prefix used in a statement from provided args.
 * @param {string} sql
 * @param {Object} args
 * @returns {string} binding character ('$' | '@' | ':')
 */
const guessBindingCharacter = (sql, args) => {
	for (const bindingChar of ['$', '@', ':']) {
		if (Object.keys(args).every(arg => sql.includes(bindingChar + arg))) {
			return bindingChar;
		}
	}
	throw new Error('Could not identify binding character');
};

/**
 * Convert a named-parameter statement into positional form for libsql.
 * @param {{sql:string,args:Object}} param0
 * @returns {{sql:string,args:any[]}}
 */
const convertToPositionalParams = ({ sql, args }) => {
	const positionalParams = [];
	const bindingCharacter = guessBindingCharacter(sql, args);
	const matcher = new RegExp(`\\${bindingCharacter}([a-zA-Z_][a-zA-Z0-9_]*)`, 'g');

	// Sanitize args - transform unsupported types to strings
	for (const [key, value] of Object.entries(args)) {
		if (value && typeof value === 'object') {
			if (value instanceof Date) {
				args[key] = value.toISOString();
			}
			else if (value.constructor === Object || value.constructor === Array) {
				args[key] = JSON.stringify(value);
			}
			else if (typeof value.toString === 'function') {
				args[key] = value.toString();
			}
			else {
				console.warn(`Unsupported type for parameter ${key}: ${value.constructor.name}`);
				args[key] = null;
			}
		}
	}
	
	// Replace named parameters in the SQL with positional parameters (?)
	const transformedSql = sql.replace(matcher, (_, paramName) => {
		if (paramName in args) {
			positionalParams.push(args[paramName]);
			return '?';
		}
		throw new Error(`Parameter ${paramName} not found in args object`);
	});

	return {
		sql: transformedSql,
		args: positionalParams
	};
};

/**
 * Normalize statements to positional args when args are present.
 * @param {string|{sql:string,args:Object}} stmt
 * @returns {string|{sql:string,args:any[]}}
 */
const normalizeStatement = (stmt) => {
	if (typeof stmt === 'object' && stmt !== null && typeof stmt.args === 'object' && !Array.isArray(stmt.args)) {
		return convertToPositionalParams(stmt);
	}
	return stmt;
};