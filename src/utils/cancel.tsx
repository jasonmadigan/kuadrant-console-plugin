import { History } from 'history';

export function handleCancel(history: History) {
  history.goBack();
}
