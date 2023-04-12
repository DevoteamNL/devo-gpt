import { Migration } from '@mikro-orm/migrations';

export class Migration20230322100019 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table `user` (`id` int unsigned not null auto_increment primary key, `username` varchar(255) not null, `provider_id` varchar(255) not null, `google_token` varchar(255) not null, `refresh_token` varchar(255) not null) default character set utf8mb4 engine = InnoDB;');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists `user`;');
  }

}
