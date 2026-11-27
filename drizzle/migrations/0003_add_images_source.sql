ALTER TABLE `questions` ADD `source` varchar(64);--> statement-breakpoint
ALTER TABLE `questions` ADD `images` text;--> statement-breakpoint
ALTER TABLE `questions` ADD `markscheme_images` text;--> statement-breakpoint
ALTER TABLE `questions` ADD `diagram_missing` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `questions` ADD `tips` text;
