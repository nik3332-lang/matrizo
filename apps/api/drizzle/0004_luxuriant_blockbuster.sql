CREATE TABLE `auth_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`destination` text NOT NULL,
	`purpose` text NOT NULL,
	`user_id` text,
	`session_version` integer DEFAULT 0 NOT NULL,
	`code_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`consumed_at` integer,
	`redemption_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_challenges_destination_purpose_idx` ON `auth_challenges` (`destination`,`purpose`);--> statement-breakpoint
CREATE TABLE `auth_rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `users` ADD `session_version` integer DEFAULT 0 NOT NULL;