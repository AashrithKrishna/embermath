CREATE TABLE `questions` (
	`id` varchar(64) NOT NULL,
	`year` int,
	`session` varchar(16),
	`timezone` varchar(8),
	`paper` varchar(16),
	`topic` varchar(128) NOT NULL,
	`subtopic` varchar(128),
	`difficulty` int NOT NULL,
	`marks` int NOT NULL,
	`statement` text NOT NULL,
	`latex` text,
	`image_url` text,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
