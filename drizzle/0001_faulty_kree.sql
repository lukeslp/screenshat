CREATE TABLE `captureJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`url` text NOT NULL,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`presets` json NOT NULL,
	`waitStrategy` varchar(64) DEFAULT 'networkidle',
	`customSelector` text,
	`extraWaitMs` int DEFAULT 0,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `captureJobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `screenshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`userId` int,
	`presetKey` varchar(64) NOT NULL,
	`width` int NOT NULL,
	`height` int NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` text NOT NULL,
	`fileSizeBytes` bigint,
	`analysisResult` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `screenshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `captureJobs` ADD CONSTRAINT `captureJobs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `screenshots` ADD CONSTRAINT `screenshots_jobId_captureJobs_id_fk` FOREIGN KEY (`jobId`) REFERENCES `captureJobs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `screenshots` ADD CONSTRAINT `screenshots_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;