import { Repository } from 'typeorm';
import { TypeormFakeEntityService } from '../../../lib/fakeEntityService';

export class BaseFakeEntityFactory<
  TEntity,
> extends TypeormFakeEntityService<TEntity> {
  constructor(protected repository: Repository<TEntity>) {
    super(repository);
  }

  async deleteAll() {
    const tableName = this.repository.metadata.tableName;
    await this.repository.query(`DELETE FROM "${tableName}"`);
  }
}
