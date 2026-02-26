-- CreateTable
CREATE TABLE `cards` (
    `id` VARCHAR(191) NOT NULL,
    `word` VARCHAR(191) NOT NULL,
    `sentence` VARCHAR(191) NOT NULL,
    `meaning_kr` VARCHAR(191) NULL,
    `pron_word_kr` VARCHAR(191) NULL,
    `sentence_kr` VARCHAR(191) NULL,
    `pron_sentence_kr` VARCHAR(191) NULL,
    `last_result` ENUM('correct', 'hold', 'wrong') NULL,
    `next_due_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `streak` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `cards_next_due_at_idx`(`next_due_at`),
    INDEX `cards_word_idx`(`word`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reviews` (
    `id` VARCHAR(191) NOT NULL,
    `card_id` VARCHAR(191) NOT NULL,
    `result` ENUM('correct', 'hold', 'wrong') NOT NULL,
    `reviewed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `next_due_at` DATETIME(3) NOT NULL,
    `streak` INTEGER NOT NULL,

    INDEX `reviews_card_id_reviewed_at_idx`(`card_id`, `reviewed_at`),
    INDEX `reviews_next_due_at_idx`(`next_due_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_card_id_fkey` FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
