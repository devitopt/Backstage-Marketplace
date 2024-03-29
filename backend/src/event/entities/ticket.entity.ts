import { Column, Entity, BeforeInsert, Exclusion, ManyToOne } from 'typeorm';
import { SoftDelete } from 'src/common/core/soft-delete';
import { User } from 'src/user/entities/user.entity';
import { EventCard } from './event_card.entity';

@Entity('tickets')
export class Ticket extends SoftDelete {
  @ManyToOne(() => EventCard, (event_card) => event_card.tickets, {
    onDelete: 'SET NULL',
  })
  eventcard: string;

  @Column()
  price: number;

  @Column({ nullable: true })
  count: string;

  @Column({ nullable: true })
  wallet_address: string;

  @Column({ nullable: true })
  blockchain: string;

  @ManyToOne(() => User, (user) => user.tickets)
  buyer: User;

  @Column()
  pay_order_id: string;

  @Column({ default: 0 })
  is_minted: number;

  @Column({ nullable: true })
  tokenURL: string;

  @Column({ nullable: true })
  ipfsURL: string;
}
