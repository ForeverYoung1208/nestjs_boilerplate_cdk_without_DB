export const CLASS_INDEXES_MESSAGES_KEY = 'indexMessages';

export function UniqueIndexMessage(
  indexName: string,
  message: string,
): ClassDecorator {
  return function (object: any) {
    if (object[CLASS_INDEXES_MESSAGES_KEY]) {
      object[CLASS_INDEXES_MESSAGES_KEY].push({
        indexName,
        message,
      });
    } else {
      object[CLASS_INDEXES_MESSAGES_KEY] = [
        {
          indexName,
          message,
        },
      ];
    }
  };
}
