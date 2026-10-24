import { useI18n } from '../i18n';
import { Empty } from '../ui/display';

export function Placeholder() {
  const { t } = useI18n();
  return (
    <div className="card">
      <Empty icon="layers" title={t('common.placeholder.title')}>
        {t('common.placeholder.body')}
      </Empty>
    </div>
  );
}
