import { useMemo } from '../lib/teact/teact';

import type { MenuItemContextAction } from '../components/ui/ListItem';

import { compact } from '../util/iteratees';

const useChatContextActions = ({
  handleDelete,
}: {
  handleDelete?: NoneToVoidFunction;
}) => {
  return useMemo(() => {
    const actionDelete = {
      title: '删除',
      icon: 'delete',
      destructive: true,
      handler: handleDelete,
    };

    return compact([actionDelete]) as MenuItemContextAction[];
  }, [
    handleDelete,
  ]);
};

export default useChatContextActions;
