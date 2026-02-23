CREATE TABLE IF NOT EXISTS `lead_magnets` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `lead_magnets_slug_unique` ON `lead_magnets` (`slug`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_magnet_id` text NOT NULL,
	`email` text,
	`name` text,
	`data` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_magnet_id`) REFERENCES `lead_magnets`(`id`) ON UPDATE no action ON DELETE no action
);
