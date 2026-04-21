const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  header?: Record<string, string>;
}

export const request = <T = any>(options: RequestOptions): Promise<T> => {
  const { url, method = 'GET', data, header } = options;

  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('auth_token');

    uni.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
        ...header,
      },
      success: (res: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else {
          const body: ApiResponse = res.data ?? {};
          uni.showToast({
            title: body.error || '请求失败',
            icon: 'none',
          });
          reject(new Error(body.error || `HTTP ${res.statusCode}`));
        }
      },
      fail: (err: any) => {
        uni.showToast({
          title: '网络异常，请重试',
          icon: 'none',
        });
        reject(err);
      },
    });
  });
};

// 兼容旧调用方式：request<T>(url, options)
export const requestLegacy = <T = any>(url: string, options: Omit<RequestOptions, 'url'> = {}): Promise<T> => {
  return request<T>({ url, ...options });
};
