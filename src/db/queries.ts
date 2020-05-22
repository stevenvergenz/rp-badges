/***** Users queries *****/

export const CreateUsersTable = `
CREATE TABLE IF NOT EXISTS Users (
	id UUID PRIMARY KEY,
	name VARCHAR(160),
	presentation_mode INTEGER,
	fit INTEGER);
`;

export const UpdateUser = `
INSERT INTO Users (id, name, presentation_mode, fit) VALUES ($1, $2, $3, $4)
ON CONFLICT (id) DO UPDATE SET
	name = EXCLUDED.name,
	presentation_mode = EXCLUDED.presentation_mode,
	fit = EXCLUDED.fit;
`;

export const GetUser = `
SELECT id, name, presentation_mode, fit FROM Users WHERE id = $1;
`;

export const DeleteUser = `
DELETE FROM Users WHERE id = $1;
`;

/***** Events queries *****/

export const CreateEventsTable = `
CREATE TABLE IF NOT EXISTS Events (
	id VARCHAR(20) PRIMARY KEY,
	name VARCHAR(160),
	timestamp TIMESTAMPTZ,
	badge_url VARCHAR(200));
`;

export const ValidateEventsTable = `
SELECT COUNT(*) > 0 AS has_events FROM Events;
`;

export const GetEvents = `
SELECT id, name, timestamp, badge_url FROM Events ORDER BY timestamp DESC LIMIT 100;
`;

export const UpdateEvents = `
INSERT INTO Events (id, name, timestamp, badge_url) VALUES %L
ON CONFLICT (id) DO UPDATE SET
	name = EXCLUDED.name,
	timestamp = EXCLUDED.timestamp,
	badge_url = EXCLUDED.badge_url;
`;

/***** Joinings queries *****/

export const CreateJoiningsTable = `
CREATE TABLE IF NOT EXISTS Joinings (
	user_id UUID NOT NULL REFERENCES Users (id) ON DELETE CASCADE,
	event_id VARCHAR(20) NOT NULL REFERENCES Events (id) ON DELETE CASCADE,
	timestamp TIMESTAMPTZ,
	PRIMARY KEY (user_id, event_id));
`;

export const AddJoining = `
INSERT INTO Joinings (user_id, event_id, timestamp) VALUES ($1, $2, NOW())
ON CONFLICT (user_id, event_id) DO NOTHING;
`;

export const GetJoinings = `
SELECT user_id, event_id, timestamp FROM Joinings
WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 100;
`;
