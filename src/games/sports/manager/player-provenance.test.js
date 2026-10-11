import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import PlayerProvenance from './player-provenance.jsx';

const render=player=>renderToStaticMarkup(React.createElement(PlayerProvenance,{player,world:{clubs:[],coverage:{}},t:spanish=>spanish}));
describe('documented player corrections',()=>{
  it('renders generated and year-only players without claiming an official correction',()=>{
    for(const real of [false,true]){
      const html=render({name:'Example',real,birthYear:1990,nationality:'ESP',position:'MF'});
      expect(html).toContain('solo consta el año de nacimiento');
      expect(html).not.toContain('contrastada con el club');
      expect(html).not.toContain('Fuente oficial');
    }
  });
  it('shows the official identity evidence only for the corrected identity',()=>{
    const player={name:'Michael Thomas',real:true,birthDate:'1988-03-08',wikidataId:'Q427832',nationality:'USA',position:'MF',identityCorrection:{to:{wikidataId:'Q427832'},sources:['https://www.sportingkc.com/players/michael-thomas/']}};
    expect(render(player)).toContain('Identidad contrastada con el club');
    expect(render(player)).toContain('https://www.sportingkc.com/players/michael-thomas/');
    expect(render({...player,wikidataId:'Q275823'})).not.toContain('Identidad contrastada con el club');
  });
});
