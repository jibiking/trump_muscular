import { useEffect } from 'react';

export function usePageSetup(page: string, title?: string) {
  useEffect(() => {
    const previousPage = document.body.dataset.page;
    if (page) {
      document.body.dataset.page = page;
    } else {
      delete document.body.dataset.page;
    }

    const previousTitle = document.title;
    if (title) {
      document.title = title;
    }

    return () => {
      if (previousPage) {
        document.body.dataset.page = previousPage;
      } else {
        delete document.body.dataset.page;
      }
      if (title) {
        document.title = previousTitle;
      }
    };
  }, [page, title]);
}
