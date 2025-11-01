import { FontsURLs } from './base-email-builder';

export const getFontsURLs = (fontsCdnHost: string): FontsURLs => {
  return {
    gilroyRegularWoff: `${fontsCdnHost}/fonts/Gilroy/gilroy-regular.woff`,
    gilroySemiBoldWoff: `${fontsCdnHost}/fonts/Gilroy/gilroy-semibold.woff`,
    gilroyExtraBoldWoff: `${fontsCdnHost}/fonts/Gilroy/gilroy-extrabold.woff`,
  };
};

export enum EmailImages {
  LOGO = 'assets/images/logo.png',
}
