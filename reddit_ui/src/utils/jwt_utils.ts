interface JwtPayload {
    fresh: boolean,
    iat: number,
    jti: string,
    type: string,
    sub: string,
    nbf: number,
    csrf: string,
    exp: number
  }

export function getExpiry(token: string): Date {
    return new Date(parseJwt(token).exp * 1000);
}

function parseJwt (token: string): JwtPayload {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}