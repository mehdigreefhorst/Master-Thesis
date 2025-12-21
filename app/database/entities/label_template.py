

from collections import defaultdict
import json
from typing import Any, Dict, List, Literal, Optional
import sys
from copy import deepcopy


sys.path.append("../../..")
from pydantic import BaseModel, Field, model_validator

from app.database.entities.base_entity import BaseEntity, PyObjectId


class LabelValueField(BaseModel):
    label: Optional[str] = None
    value: Optional[Any] = None # None if not yet set. Or when it is part of a label_template_entity
    type: Literal["string", "boolean", "category", "integer", "float"]  # type of what the possible label can be 


class LLMLabelField(LabelValueField):
    explanation: str # explanation of what the variable does
    possible_values: List = [] # e.g. [positive, neutral, negative]  | leave empty if all values are acceptable. 

    @model_validator(mode="after")
    def add_possible_values(self):
        if not self.possible_values:
            if self.type == "boolean":
                self.possible_values = [True, False]
            elif self.type == "integer":
                self.possible_values = f"insert {self.label} here as a {self.type}!"
            elif self.type == "float":
                self.possible_values = f"insert {self.label} here as a {self.type}!"
            elif self.type == "string":
                self.possible_values = f"insert {self.label} here as a {self.type}!"
            elif self.type == "category":
                raise Exception("The type == category, so possible values must be set!")
            else:
                raise Exception(f"type = {self.type}An unkown type is set, I don't know it! THe fuck!")
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
    
    def label_value_allowed(self, label_value):
        if self.type == "string":
            return isinstance(label_value, str)
        elif self.type == "boolean":
            return isinstance(label_value, bool)
        elif self.type =="category":
            return label_value in self.possible_values
        elif self.type =="float":
            return isinstance(label_value, float)
        elif self.type == "integer":
            return isinstance(label_value, int)
        else:
            raise Exception("The types are not complete. THere is type that is not known")

class ProjectionLabelField(LabelValueField):
    """this class is build with real data. This is very similar to the LLMLabelField. But then it has the truly predicted information from the LLM. Also is used for ground truth"""
    per_label_details: List[LabelValueField] = Field(default_factory=list)


labelName= str

class LabelTemplateLLMProjection(BaseModel):
    """the instance of a prediction run LLM labeling of data"""
    label_template_id: PyObjectId
    experiment_id: PyObjectId
    values: Dict[labelName, ProjectionLabelField] = Field(default_factory=dict) # key is label_value.label name of a LabelTemplateLLMProjection

    def get_prediction_counter(self) -> Dict[str, int]:
        """create prediction counter, where it is a dictionary. where each of the variable names, of the boolean types, gets a 1 if true. and 0 if false"""
        prediction_counter = defaultdict(int)
        for label_name, llm_prediction_label_field in self.values.items():
            if llm_prediction_label_field.type == "boolean":
                prediction_counter[label_name] += 1 if llm_prediction_label_field.value == True else 0
        
        return prediction_counter
    

class LabelTemplateTruthProjection(BaseModel):
    """the instance of the ground truth of the label template entity"""
    label_template_id: PyObjectId
    values: Dict[labelName, LabelValueField] = Field(default_factory=dict) # key is label_value.label name of a LabelTemplateLLMProjection


class LabelTemplateEntity(BaseEntity):
    user_id: str # PyObjectId
    label_template_name: str
    label_template_description: str
    is_public: bool = True
    labels: List[LLMLabelField] # List of the possible labels the llm can predict & also part of ground truth
    llm_prediction_fields_per_label: List[LLMLabelField] # extra labels predicted for each of the predicted labels.  such as reason
    multi_label_possible: bool # whether LLM should pick a single or may pick multiple
    combined_labels: Dict[str, List[labelName]] = None
    ground_truth_field: Optional[LabelTemplateTruthProjection] = None #Optional[Dict[labelName, ProjectionLabelField]] = None
    labels_llm_prompt_response_format: Optional[Dict] = None # output format of how we would like the LLM to respond the data in
    ground_truth_one_shot_example: Optional[Dict[labelName, ProjectionLabelField]] = None # key is label_value.label name of a LabelTemplateLLMProjection

    @model_validator(mode="after")
    def auto_create_fields(self):
        if not self.ground_truth_field:
            self._create_ground_truth_field()

        if not self.labels_llm_prompt_response_format:
            self.labels_llm_prompt_response_format = self.create_labels_llm_prompt_response_format_field()

        return self
    
    def _create_ground_truth_field(self):
        
        ground_truth_values: Dict[labelName, LabelValueField] = dict()

        for label in self.labels:
            ground_truth_values[label.label] = LabelValueField(label=label.label, value=None, type=label.type) 
        
        grond_truth_field = LabelTemplateTruthProjection(label_template_id=self.id,
                                                         values=ground_truth_values)


        self.ground_truth_field = grond_truth_field
        return grond_truth_field
    

    def create_labels_llm_prompt_response_format_field(self, cluster_unit_entity: Optional["ClusterUnitEntity"] = None):
        """makes the projection format for how the response format is for LLM. Here it looks at how the model should respond the data in, to make it useful for cluster unit prediction."""
        # TODO should we make it so that the ground truth & llm response format is never saved to the database. but always recreated?
        prediction_field = dict()
        # prediction_field["label_template_id"] = self.id
        # prediction_field["experiment_id"] = None

        for label in self.labels:
            label_dict = dict()
            # We take the value of the label of cluster_unit_entity if it is provided
            label_dict["value"] = cluster_unit_entity.ground_truth.get(self.id).values.get(label.label).value if cluster_unit_entity else label.possible_values # This might lead to issues because we are not super explicit to the LLM if to make a list of a string of the output value
            for per_label_field in self.llm_prediction_fields_per_label:
                label_dict[per_label_field.label] = per_label_field.possible_values[0] if len(per_label_field.possible_values) <=1 else per_label_field.possible_values
            # print("label.label = ", label.label)
            # print("prediction_field = ", per_label_field)
            # print("label_dict = ", label_dict)
            prediction_field[label.label] = label_dict.copy()
        
        return prediction_field.copy()
    

    def create_one_shot_llm_prompt(self):
        if self.ground_truth_one_shot_example is None:
            return {"oneshot_example": "infer the example from format"}
        
        prediction_field = dict()
        for label_name, projection in self.ground_truth_one_shot_example.items():
            label_dict = dict()
            # We take the value of the label of cluster_unit_entity if it is provided
            label_dict["value"] = projection.value
            for per_label_field in projection.per_label_details:
                label_dict[per_label_field.label] = per_label_field.value
            # print("label.label = ", label.label)
            # print("prediction_field = ", per_label_field)
            # print("label_dict = ", label_dict)
            prediction_field[label_name] = label_dict.copy()
        
        return prediction_field


    def create_llm_prompt_explanation_with_response_format(self):
        """
        creates the explanation of variables section for the LLM. Example of output is:

            ### Explanation of what Variables to predict
            YOU CAN PICK MULTIPLE LABELS IF IT APPLIES
            problem_description: the sentiment of the redditor in the message, reason: the reasoning for your choice for the label 
            frustration_expression: the sentiment of the redditor in the message, reason: the reasoning for your choice for the label 
            solution_seeking: the sentiment of the redditor in the message, reason: the reasoning for your choice for the label 
            solution_proposing: the sentiment of the redditor in the message, reason: the reasoning for your choice for the label 
            agreement_empathy: the sentiment of the redditor in the message, reason: the reasoning for your choice for the label 
            sentiment: the sentiment of the redditor in the message, reason: the reasoning for your choice for the label 

        
            ### Response format. Respond with following structure. Pick / predict correct!
            {
                "problem_description": {
                    "value": [
                        true,
                        false
                    ],
                    "reason": [
                        "insert reason here as a string!"
                    ]
                },
                "frustration_expression": {
                    "value": [
                        true,
                        false
                    ],
                    "reason": [
                        "insert reason here as a string!"
                    ]
                },
                "solution_seeking": {
                    "value": [
                        true,
                        false
                    ],
                    "reason": [
                        "insert reason here as a string!"
                    ]
                },
                "solution_proposing": {
                    "value": [
                        true,
                        false
                    ],
                    "reason": [
                        "insert reason here as a string!"
                    ]
                },
                "agreement_empathy": {
                    "value": [
                        true,
                        false
                    ],
                    "reason": [
                        "insert reason here as a string!"
                    ]
                },
                "sentiment": {
                    "value": [
                        true,
                        false
                    ],
                    "reason": [
                        "insert reason here as a string!"
                    ]
                }
            }
        """
        
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
    
    def create_prompt_template_name(self):
        return self.label_template_name
    
    def create_prompt_template_description(self):
        return self.label_template_description
    
    def create_prompt_variable_description(self):
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
        
        return parse_labels()
    
    def create_prompt_variable_expected_output(self):
        return json.dumps(self.labels_llm_prompt_response_format, indent=4)
    
    def from_prediction(self, llm_response_dict: Dict, experiment_id: PyObjectId) -> LabelTemplateLLMProjection:
        """creates an instance of LabelInstance, from the dictionary that was created by an LLM"""
        label_prediction_instance = LabelTemplateLLMProjection(label_template_id=self.id, experiment_id=experiment_id)
        input_dict = deepcopy(llm_response_dict)
        for label in self.labels:
            label_prediction_dict = input_dict.pop(label.label)
            value_label = label_prediction_dict.pop("value")
            per_label_value_fields = list()
            for per_label in self.llm_prediction_fields_per_label:
                per_label_value = label_prediction_dict.pop(per_label.label)
                # :TODO here you should add a check, to see if the per label field is for every variable. If we set it that per label fields can be optional for some
                per_label_value_fields.append(LabelValueField(label=per_label.label, value=per_label_value, type=per_label.type))

            if label_prediction_dict:
                raise Exception(f"the label_prediction_dict should be empty! BUt it is not. label_prediction_dict = {label_prediction_dict}")
            label_value_per_label_field = ProjectionLabelField(label=label.label, value=value_label, type=label.type, per_label_details=per_label_value_fields)
            label_prediction_instance.values[label.label] =  label_value_per_label_field
        
        return label_prediction_instance

    def is_ground_truth_value_part_of_label(self, label_name: str, label_value):
        """check if the ground truth to add is of the correct """
        for label in self.labels:
            if label.label == label_name:
                return label.label_value_allowed(label_value)
    
    def is_per_label_value_part_of_label(self, per_label_name: str, per_label_value):
        """check if the ground truth to add is of the correct """
        for label in self.llm_prediction_fields_per_label:
            if label.label == per_label_name:
                return label.label_value_allowed(per_label_value)


    def get_labels(self):
        labels: List[str] = list()
        for label in self.labels:
            labels.append(label.label)
        
        return labels




    


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
    print(label_template_entity.create_llm_prompt_explanation_with_response_format())
    true = "true"
    false = "false"
    print(label_template_entity.from_prediction({
    "problem_description": {
        "value": [
            true,
            false
        ],
        "reason": [
            "insert reason here as a string!"
        ]
    },
    "frustration_expression": {
        "value": [
            true,
            false
        ],
        "reason": [
            "insert reason here as a string!"
        ]
    },
    "solution_seeking": {
        "value": [
            true,
            false
        ],
        "reason": [
            "insert reason here as a string!"
        ]
    },
    "solution_proposing": {
        "value": [
            true,
            false
        ],
        "reason": [
            "insert reason here as a string!"
        ]
    },
    "agreement_empathy": {
        "value": [
            true,
            false
        ],
        "reason": [
            "insert reason here as a string!"
        ]
    },
    "sentiment": {
        "value": [
            true,
            false
        ],
        "reason": [
            "insert reason here as a string!"
        ]
    }
}, "1234"))