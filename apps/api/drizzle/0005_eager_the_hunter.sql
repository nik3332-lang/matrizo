CREATE TABLE `push_devices` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_version` integer NOT NULL,
	`platform` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `push_devices_user_idx` ON `push_devices` (`user_id`);--> statement-breakpoint
CREATE TABLE `push_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`order_id` text NOT NULL,
	`token` text NOT NULL,
	`order_status` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`ticket_id` text,
	`last_error` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `order_status_events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`token`) REFERENCES `push_devices`(`token`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_jobs_event_token_idx` ON `push_jobs` (`event_id`,`token`);--> statement-breakpoint
CREATE INDEX `push_jobs_due_idx` ON `push_jobs` (`next_attempt_at`);--> statement-breakpoint
ALTER TABLE `orders` ADD `checkout_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_user_checkout_key_idx` ON `orders` (`user_id`,`checkout_key`);--> statement-breakpoint
ALTER TABLE `users` ADD `deletion_requested_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `deleted_at` integer;