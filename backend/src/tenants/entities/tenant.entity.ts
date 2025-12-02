import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Resident } from '../../residents/entities/resident.entity';
import { User } from '../../users/entities/user.entity';
import { Visitor } from '../../visitors/entities/visitor.entity';

@Entity({ name: 'tenants' })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Resident, (resident) => resident.tenant)
  residents?: Resident[];

  @OneToMany(() => User, (user) => user.tenant)
  users?: User[];

  @OneToMany(() => Visitor, (visitor) => visitor.tenant)
  visitors?: Visitor[];
}
