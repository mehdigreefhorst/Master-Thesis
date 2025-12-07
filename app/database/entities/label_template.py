

import json
from typing import Any, Dict, List, Literal, Optional
import sys

sys.path.append("../../..")
from pydantic import BaseModel, model_validator

from app.database.entities.base_entity import BaseEntity, PyObjectId
#from app.database.entities.base_entity import BaseEntity, PyObjectId


class LLMLabelField(BaseModel):
    label: str
    explanation: str
    possible_values: List = [] # e.g. [positive, neutral, negative]  | leave empty if all values are acceptable. 
    type: Literal["string", "boolean", "category", "integer", "float"] # type of what the possible label can be 

    @model_validator(mode="after")
    def add_possible_values(self):
        if not self.possible_values:
            if self.type == "boolean":
                self.possible_values = [True, False]
            elif self.type == "integer":
                self.possible_values = [f"insert {self.label} here as a {self.type}!"]
            elif self.type == "float":
                self.possible_values = [f"insert {self.label} here as a {self.type}!"]
            elif self.type == "string":
                self.possible_values = [f"insert {self.label} here as a {self.type}!"]
            elif self.type == "category":
                raise Exception("The type == category, so possible values must be set!")
        return self


    def parse_for_llm(self, with_label_type_giving: bool= False):
        """parses the explanation for the LLM of what the variables do"""
        label_plus_explanation = f"{self.label}: {self.explanation}"
        
        if self.type == "boolean":
            type_format_explanation = f" -> Respond with True/False"
        elif self.type == "category":
            type_format_explanation = f" -> Possible values (pick 1): {self.possible_values}"
        elif self.type == "integer":
            type_format_explanation = f" -> value must be an integer"
        elif self.type == "float":
            type_format_explanation = f" -> value must be an float"
        elif self.type == "string":
            type_format_explanation = f""
        else:
            type_format_explanation = f""
        
        if with_label_type_giving:
            label_plus_explanation += type_format_explanation
        return label_plus_explanation


class LabelTemplateEntity(BaseEntity):
    user_id: str # PyObjectId
    category_name: str
    category_description: str
    is_public: bool = True
    labels: List[LLMLabelField] # List of the possible labels the llm can predict & also part of ground truth
    llm_prediction_fields_per_label: List[LLMLabelField] # extra labels predicted for each of the predicted labels.  such as reason
    multi_label_possible: bool # whether LLM should pick a single or may pick multiple
    ground_truth_field: Optional[Dict] = None
    labels_llm_prompt_response_format: Optional[Dict] = None

    @model_validator(mode="after")
    def auto_create_fields(self):
        if not self.ground_truth_field:
            self._create_ground_truth_field()

        if not self.labels_llm_prompt_response_format:
            self._create_labels_llm_prompt_response_format_field()

        return self
    
    def _create_ground_truth_field(self):
        grond_truth_field = dict()
        grond_truth_field["label_template_id"] = self.id
        for label in self.labels:
            grond_truth_field[label.label] = {"value": None}

        self.ground_truth_field = grond_truth_field


    def _create_labels_llm_prompt_response_format_field(self):
        """makes the projection format for how the response format is for LLM. Here it looks at how the model should respond the data in, to make it useful for cluster unit prediction."""
        # TODO should we make it so that the ground truth & llm response format is never saved to the database. but always recreated?
        prediction_field = dict()
        prediction_field["label_template_id"] = self.id
        prediction_field["experiment_id"] = None

        for label in self.labels:
            label_dict = dict()
            label_dict["value"] = label.possible_values # This might lead to issues because we are not super explicit to the LLM if to make a list of a string of the output value
            for per_label_field in self.llm_prediction_fields_per_label:
                label_dict[per_label_field.label] = per_label_field.possible_values
            # print("label.label = ", label.label)
            # print("prediction_field = ", per_label_field)
            # print("label_dict = ", label_dict)
            prediction_field[label.label] = label_dict.copy()
        
        import json
        print(json.dumps(prediction_field, indent=4))
        self.labels_llm_prompt_response_format = prediction_field.copy()

    
    def convert_llm_prediction_format(self):
        
        def parse_per_label_text():
            text_to_add  = ""
            for per_label_field in self.llm_prediction_fields_per_label:
                if text_to_add: 
                    text_to_add += ", "
                text_to_add += per_label_field.parse_for_llm()
            
            return text_to_add
        
        def parse_labels():
            text_to_add = "YOU CAN PICK MULTIPLE LABELS IF IT APPLIES\n" if self.multi_label_possible else "PICK ONLY A SIGNLE LABEL FROM THE LABELS BELOW\n"
            for label in self.labels:
                text_to_add +=label.parse_for_llm()
                per_label_text = parse_per_label_text()
                if per_label_text:
                    text_to_add += ", " + per_label_text
                text_to_add += "\n"
            
            return text_to_add
                
                
        prompt = """
### Explanation of what Variables to predict
    {{labels_explanation}}


### Response format. Respond with following structure. Pick / predict correct!
{{labels_llm_response_format}}
"""\
        .replace("{{labels_explanation}}", parse_labels())\
        .replace("{{labels_llm_response_format}}",  json.dumps(self.labels_llm_prompt_response_format, indent=4))
        return prompt
    

class LabelInstance(BaseModel):
    label_template_id: PyObjectId
    values: Dict[str, Any]


    


if __name__ == "__main__":
    import time
    start = time.perf_counter()

    label_template_entity = LabelTemplateEntity(user_id="1",
                                              category_name="Painpoint analysis categories",
                                              category_description="these categories explain the painpoints of possible customes",
                                              is_public=True,
                                              labels=[
                                                  LLMLabelField(
                                                      label="problem_description",
                                                      explanation="the sentiment of the redditor in the message",
                                                      type="boolean"
                                                  ),
                                                  LLMLabelField(
                                                      label="frustration_expression",
                                                      explanation="the sentiment of the redditor in the message",
                                                      type="boolean"
                                                  ),
                                                  LLMLabelField(
                                                      label="solution_seeking",
                                                      explanation="the sentiment of the redditor in the message",
                                                      type="boolean"
                                                  ),
                                                  LLMLabelField(
                                                      label="solution_proposing",
                                                      explanation="the sentiment of the redditor in the message",
                                                      type="boolean"
                                                  ),
                                                  LLMLabelField(
                                                      label="agreement_empathy",
                                                      explanation="the sentiment of the redditor in the message",
                                                      type="boolean"
                                                  ),
                                                  LLMLabelField(
                                                  label="sentiment",
                                                  explanation="the sentiment of the redditor in the message",
                                                  type="boolean")
                                                  
                                                  ],
                                                  multi_label_possible=True,
                                                  llm_prediction_fields_per_label=[ LLMLabelField(
                                                      label="reason",
                                                      explanation="the reasoning for your choice for the label ",
                                                      type="string"
                                                  )]

                                              )
    
    
    
    end = time.perf_counter()

    print(f"total duration = {end-start} seconds!")
    

    

    # print(label_template_entity)
    print(label_template_entity.convert_llm_prediction_format())