export interface User {
    _id?: string;
    name: string;
    email: string;
    imgUrl?: string;
    role?: 'admin' | 'user';
}
